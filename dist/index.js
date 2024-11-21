// src/index.ts
import { ethers as ethers4 } from "ethers";

// src/rest/custom.ts
import { ethers } from "ethers";
var CustomOperations = class {
  exchange;
  infoApi;
  wallet;
  symbolConversion;
  walletAddress;
  constructor(exchange, infoApi, privateKey, symbolConversion, walletAddress = null) {
    this.exchange = exchange;
    this.infoApi = infoApi;
    this.wallet = new ethers.Wallet(privateKey);
    this.symbolConversion = symbolConversion;
    this.walletAddress = walletAddress;
  }
  async cancelAllOrders(symbol) {
    try {
      const address = this.walletAddress || this.wallet.address;
      const openOrders = await this.infoApi.getUserOpenOrders(address);
      let ordersToCancel;
      for (let order of openOrders) {
        order.coin = await this.symbolConversion.convertSymbol(order.coin);
      }
      if (symbol) {
        ordersToCancel = openOrders.filter((order) => order.coin === symbol);
      } else {
        ordersToCancel = openOrders;
      }
      if (ordersToCancel.length === 0) {
        throw new Error("No orders to cancel");
      }
      const cancelRequests = ordersToCancel.map((order) => ({
        coin: order.coin,
        o: order.oid
      }));
      const response = await this.exchange.cancelOrder(cancelRequests);
      return response;
    } catch (error) {
      throw error;
    }
  }
  async getAllAssets() {
    return await this.symbolConversion.getAllAssets();
  }
  DEFAULT_SLIPPAGE = 0.05;
  async getSlippagePrice(symbol, isBuy, slippage, px) {
    const convertedSymbol = await this.symbolConversion.convertSymbol(symbol);
    if (!px) {
      const allMids = await this.infoApi.getAllMids();
      px = Number(allMids[convertedSymbol]);
    }
    const isSpot = symbol.includes("-SPOT");
    const decimals = px.toString().split(".")[1]?.length || 0;
    console.log(decimals);
    px *= isBuy ? 1 + slippage : 1 - slippage;
    return Number(px.toFixed(isSpot ? 8 : decimals - 1));
  }
  async marketOpen(symbol, isBuy, size, px, slippage = this.DEFAULT_SLIPPAGE, cloid) {
    const convertedSymbol = await this.symbolConversion.convertSymbol(symbol);
    const slippagePrice = await this.getSlippagePrice(convertedSymbol, isBuy, slippage, px);
    console.log("Slippage Price: ", slippagePrice);
    const orderRequest = {
      coin: convertedSymbol,
      is_buy: isBuy,
      sz: size,
      limit_px: slippagePrice,
      order_type: { limit: { tif: "Ioc" } },
      reduce_only: false
    };
    if (cloid) {
      orderRequest.cloid = cloid;
    }
    console.log(orderRequest);
    return this.exchange.placeOrder(orderRequest);
  }
  async marketClose(symbol, size, px, slippage = this.DEFAULT_SLIPPAGE, cloid) {
    const convertedSymbol = await this.symbolConversion.convertSymbol(symbol);
    const address = this.walletAddress || this.wallet.address;
    const positions = await this.infoApi.perpetuals.getClearinghouseState(address);
    for (const position of positions.assetPositions) {
      const item = position.position;
      if (convertedSymbol !== item.coin) {
        continue;
      }
      const szi = parseFloat(item.szi);
      const closeSize = size || Math.abs(szi);
      const isBuy = szi < 0;
      const slippagePrice = await this.getSlippagePrice(convertedSymbol, isBuy, slippage, px);
      const orderRequest = {
        coin: convertedSymbol,
        is_buy: isBuy,
        sz: closeSize,
        limit_px: slippagePrice,
        order_type: { limit: { tif: "Ioc" } },
        reduce_only: true
      };
      if (cloid) {
        orderRequest.cloid = cloid;
      }
      return this.exchange.placeOrder(orderRequest);
    }
    throw new Error(`No position found for ${convertedSymbol}`);
  }
  async closeAllPositions(slippage = this.DEFAULT_SLIPPAGE) {
    try {
      const address = this.walletAddress || this.wallet.address;
      const positions = await this.infoApi.perpetuals.getClearinghouseState(address);
      const closeOrders = [];
      console.log(positions);
      for (const position of positions.assetPositions) {
        const item = position.position;
        if (parseFloat(item.szi) !== 0) {
          const symbol = await this.symbolConversion.convertSymbol(item.coin, "forward");
          closeOrders.push(this.marketClose(symbol, void 0, void 0, slippage));
        }
      }
      return await Promise.all(closeOrders);
    } catch (error) {
      throw error;
    }
  }
};

// src/rest/exchange.ts
import { ethers as ethers3 } from "ethers";

// src/types/constants.ts
var BASE_URLS = {
  PRODUCTION: "https://api.hyperliquid.xyz",
  TESTNET: "https://api.hyperliquid-testnet.xyz"
};
var WSS_URLS = {
  PRODUCTION: "wss://api.hyperliquid.xyz/ws",
  TESTNET: "wss://api.hyperliquid-testnet.xyz/ws"
};
var ENDPOINTS = {
  INFO: "/info",
  EXCHANGE: "/exchange"
};

// src/utils/helpers.ts
import axios from "axios";

// src/utils/errors.ts
var HyperliquidAPIError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "HyperliquidAPIError";
  }
};
var AuthenticationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthenticationError";
  }
};
function handleApiError(error) {
  if (error.response) {
    throw new HyperliquidAPIError(
      error.response.data.code || error.response.status || "UNKNOWN_ERROR",
      error.response.data.message || error.response.data || "An unknown error occurred"
    );
  } else if (error.request) {
    throw new HyperliquidAPIError("NETWORK_ERROR", "No response received from the server");
  } else {
    throw new HyperliquidAPIError("REQUEST_SETUP_ERROR", error.message);
  }
}

// src/utils/helpers.ts
var HttpApi = class {
  client;
  endpoint;
  rateLimiter;
  constructor(baseUrl, endpoint = "/", rateLimiter) {
    this.endpoint = endpoint;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json"
      }
    });
    this.rateLimiter = rateLimiter;
  }
  async makeRequest(payload, weight = 2, endpoint = this.endpoint) {
    try {
      await this.rateLimiter.waitForToken(weight);
      const response = await this.client.post(endpoint, payload);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  }
};

// src/utils/signing.ts
import { encode } from "@msgpack/msgpack";
import {
  ethers as ethers2,
  getBytes,
  keccak256,
  TypedDataEncoder
} from "ethers";
var phantomDomain = {
  chainId: 1337,
  name: "Exchange",
  version: "1",
  verifyingContract: "0x0000000000000000000000000000000000000000"
};
var agentTypes = {
  Agent: [
    { name: "source", type: "string" },
    { name: "connectionId", type: "bytes32" }
  ]
};
function orderTypeToWire(orderType) {
  if (orderType.limit) {
    return { limit: orderType.limit };
  } else if (orderType.trigger) {
    return {
      trigger: {
        triggerPx: floatToWire(Number(orderType.trigger.triggerPx)),
        isMarket: orderType.trigger.isMarket,
        tpsl: orderType.trigger.tpsl
      }
    };
  }
  throw new Error("Invalid order type");
}
function addressToBytes(address) {
  return getBytes(address);
}
function actionHash(action, vaultAddress, nonce) {
  const msgPackBytes = encode(action);
  const additionalBytesLength = vaultAddress === null ? 9 : 29;
  const data = new Uint8Array(msgPackBytes.length + additionalBytesLength);
  data.set(msgPackBytes);
  const view = new DataView(data.buffer);
  view.setBigUint64(msgPackBytes.length, BigInt(nonce), false);
  if (vaultAddress === null) {
    view.setUint8(msgPackBytes.length + 8, 0);
  } else {
    view.setUint8(msgPackBytes.length + 8, 1);
    data.set(addressToBytes(vaultAddress), msgPackBytes.length + 9);
  }
  return keccak256(data);
}
function constructPhantomAgent(hash, isMainnet) {
  return { source: isMainnet ? "a" : "b", connectionId: hash };
}
async function signL1Action(wallet, action, activePool, nonce, isMainnet) {
  const hash = actionHash(action, activePool, nonce);
  const phantomAgent = constructPhantomAgent(hash, isMainnet);
  const data = {
    domain: phantomDomain,
    types: agentTypes,
    primaryType: "agent",
    message: phantomAgent
  };
  return signInner(wallet, data);
}
async function signUserSignedAction(wallet, action, payloadTypes, primaryType, isMainnet) {
  action.signatureChainId = "0x66eee";
  action.hyperliquidChain = isMainnet ? "Mainnet" : "Testnet";
  const data = {
    domain: {
      name: "HyperliquidSignTransaction",
      version: "1",
      chainId: 421614,
      verifyingContract: "0x0000000000000000000000000000000000000000"
    },
    types: {
      [primaryType]: payloadTypes
    },
    primaryType,
    message: action
  };
  return signInner(wallet, data);
}
async function signUsdTransferAction(wallet, action, isMainnet) {
  return signUserSignedAction(
    wallet,
    action,
    [
      { name: "hyperliquidChain", type: "string" },
      { name: "destination", type: "string" },
      { name: "amount", type: "string" },
      { name: "time", type: "uint64" }
    ],
    "HyperliquidTransaction:UsdSend",
    isMainnet
  );
}
async function signWithdrawFromBridgeAction(wallet, action, isMainnet) {
  return signUserSignedAction(
    wallet,
    action,
    [
      { name: "hyperliquidChain", type: "string" },
      { name: "destination", type: "string" },
      { name: "amount", type: "string" },
      { name: "time", type: "uint64" }
    ],
    "HyperliquidTransaction:Withdraw",
    isMainnet
  );
}
async function signAgent(wallet, action, isMainnet) {
  return signUserSignedAction(
    wallet,
    action,
    [
      { name: "hyperliquidChain", type: "string" },
      { name: "agentAddress", type: "address" },
      { name: "agentName", type: "string" },
      { name: "nonce", type: "uint64" }
    ],
    "HyperliquidTransaction:ApproveAgent",
    isMainnet
  );
}
async function signInner(wallet, data) {
  return splitSig(
    wallet.signingKey.sign(
      TypedDataEncoder.hash(data.domain, data.types, data.message)
    ).serialized
  );
}
function splitSig(sig) {
  const { r, s, v } = ethers2.Signature.from(sig);
  return { r, s, v };
}
function floatToWire(x) {
  const rounded = x.toFixed(8);
  if (Math.abs(parseFloat(rounded) - x) >= 1e-12) {
    throw new Error(`floatToWire causes rounding: ${x}`);
  }
  let normalized = rounded.replace(/\.?0+$/, "");
  if (normalized === "-0") normalized = "0";
  return normalized;
}
function floatToIntForHashing(x) {
  return floatToInt(x, 8);
}
function floatToUsdInt(x) {
  return floatToInt(x, 6);
}
function floatToInt(x, power) {
  const withDecimals = x * Math.pow(10, power);
  if (Math.abs(Math.round(withDecimals) - withDecimals) >= 1e-3) {
    throw new Error(`floatToInt causes rounding: ${x}`);
  }
  return Math.round(withDecimals);
}
function getTimestampMs() {
  return Date.now();
}
function orderRequestToOrderWire(order, asset) {
  const orderWire = {
    a: asset,
    b: order.is_buy,
    p: floatToWire(order.limit_px),
    s: floatToWire(order.sz),
    r: order.reduce_only,
    t: orderTypeToWire(order.order_type)
  };
  if (order.cloid !== void 0) {
    orderWire.c = order.cloid;
  }
  return orderWire;
}
function cancelOrderToAction(cancelRequest) {
  return {
    type: "cancel",
    cancels: [cancelRequest]
  };
}
function orderWiresToOrderAction(orderWires) {
  return {
    type: "order",
    orders: orderWires,
    grouping: "na"
  };
}

// src/rest/exchange.ts
var ExchangeAPI = class {
  constructor(testnet, privateKey, info, rateLimiter, symbolConversion, walletAddress = null) {
    this.info = info;
    const baseURL = testnet ? BASE_URLS.TESTNET : BASE_URLS.PRODUCTION;
    this.IS_MAINNET = !testnet;
    this.httpApi = new HttpApi(baseURL, ENDPOINTS.EXCHANGE, rateLimiter);
    this.wallet = new ethers3.Wallet(privateKey);
    this.symbolConversion = symbolConversion;
    this.walletAddress = walletAddress;
  }
  wallet;
  httpApi;
  symbolConversion;
  IS_MAINNET = true;
  walletAddress;
  async getAssetIndex(symbol) {
    const index = await this.symbolConversion.getAssetIndex(symbol);
    if (index === void 0) {
      throw new Error(`Unknown asset: ${symbol}`);
    }
    return index;
  }
  async placeOrder(orderRequest) {
    try {
      const assetIndex = await this.getAssetIndex(orderRequest.coin);
      const orderWire = orderRequestToOrderWire(orderRequest, assetIndex);
      const action = orderWiresToOrderAction([orderWire]);
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        orderRequest.vaultAddress || null,
        nonce,
        this.IS_MAINNET
      );
      const payload = { action, nonce, signature };
      const response = await this.httpApi.makeRequest(payload, 1);
      return response;
    } catch (error) {
      throw error;
    }
  }
  //Cancel using order id (oid)
  async cancelOrder(cancelRequests) {
    try {
      const cancels = Array.isArray(cancelRequests) ? cancelRequests : [cancelRequests];
      const cancelsWithIndices = await Promise.all(
        cancels.map(async (req) => ({
          ...req,
          a: await this.getAssetIndex(req.coin)
        }))
      );
      const action = {
        type: "cancel" /* CANCEL */,
        cancels: cancelsWithIndices.map(({ a, o }) => ({ a, o }))
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.IS_MAINNET
      );
      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }
  //Cancel using a CLOID
  async cancelOrderByCloid(symbol, cloid) {
    try {
      const assetIndex = await this.getAssetIndex(symbol);
      const action = {
        type: "cancelByCloid" /* CANCEL_BY_CLOID */,
        cancels: [{ asset: assetIndex, cloid }]
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.IS_MAINNET
      );
      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }
  //Modify a single order
  async modifyOrder(oid, orderRequest) {
    try {
      const assetIndex = await this.getAssetIndex(orderRequest.coin);
      const orderWire = orderRequestToOrderWire(orderRequest, assetIndex);
      const action = {
        type: "modify" /* MODIFY */,
        oid,
        order: orderWire
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.IS_MAINNET
      );
      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }
  //Modify multiple orders at once
  async batchModifyOrders(modifies) {
    try {
      const assetIndices = await Promise.all(
        modifies.map((m) => this.getAssetIndex(m.order.coin))
      );
      const action = {
        type: "batchModify" /* BATCH_MODIFY */,
        modifies: modifies.map((m, index) => {
          return {
            oid: m.oid,
            order: orderRequestToOrderWire(m.order, assetIndices[index])
          };
        })
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.IS_MAINNET
      );
      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }
  //Update leverage. Set leverageMode to "cross" if you want cross leverage, otherwise it'll set it to "isolated by default"
  async updateLeverage(symbol, leverageMode, leverage) {
    try {
      const assetIndex = await this.getAssetIndex(symbol);
      const action = {
        type: "updateLeverage" /* UPDATE_LEVERAGE */,
        asset: assetIndex,
        isCross: leverageMode === "cross",
        leverage
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.IS_MAINNET
      );
      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }
  //Update how much margin there is on a perps position
  async updateIsolatedMargin(symbol, isBuy, ntli) {
    try {
      const assetIndex = await this.getAssetIndex(symbol);
      const action = {
        type: "updateIsolatedMargin" /* UPDATE_ISOLATED_MARGIN */,
        asset: assetIndex,
        isBuy,
        ntli
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.IS_MAINNET
      );
      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }
  //Takes from the perps wallet and sends to another wallet without the $1 fee (doesn't touch bridge, so no fees)
  async usdTransfer(destination, amount) {
    try {
      const action = {
        type: "usdSend" /* USD_SEND */,
        hyperliquidChain: this.IS_MAINNET ? "Mainnet" : "Testnet",
        signatureChainId: "0xa4b1",
        destination,
        amount: amount.toString(),
        time: Date.now()
      };
      const signature = await signUsdTransferAction(
        this.wallet,
        action,
        this.IS_MAINNET
      );
      const payload = { action, nonce: action.time, signature };
      return this.httpApi.makeRequest(
        payload,
        1,
        this.walletAddress || this.wallet.address
      );
    } catch (error) {
      throw error;
    }
  }
  //Transfer SPOT assets i.e PURR to another wallet (doesn't touch bridge, so no fees)
  async spotTransfer(destination, token, amount) {
    try {
      const action = {
        type: "spotSend" /* SPOT_SEND */,
        hyperliquidChain: this.IS_MAINNET ? "Mainnet" : "Testnet",
        signatureChainId: "0xa4b1",
        destination,
        token,
        amount,
        time: Date.now()
      };
      const signature = await signUserSignedAction(
        this.wallet,
        action,
        [
          { name: "hyperliquidChain", type: "string" },
          { name: "destination", type: "string" },
          { name: "token", type: "string" },
          { name: "amount", type: "string" },
          { name: "time", type: "uint64" }
        ],
        "HyperliquidTransaction:SpotSend",
        this.IS_MAINNET
      );
      const payload = { action, nonce: action.time, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }
  //Withdraw USDC, this txn goes across the bridge and costs $1 in fees as of writing this
  async initiateWithdrawal(destination, amount) {
    try {
      const action = {
        type: "withdraw3" /* WITHDRAW */,
        hyperliquidChain: this.IS_MAINNET ? "Mainnet" : "Testnet",
        signatureChainId: "0xa4b1",
        destination,
        amount: amount.toString(),
        time: Date.now()
      };
      const signature = await signWithdrawFromBridgeAction(
        this.wallet,
        action,
        this.IS_MAINNET
      );
      const payload = { action, nonce: action.time, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }
  //Transfer between spot and perpetual wallets (intra-account transfer)
  async transferBetweenSpotAndPerp(usdc, toPerp) {
    try {
      const action = {
        type: "spotUser" /* SPOT_USER */,
        classTransfer: {
          usdc: usdc * 1e6,
          toPerp
        }
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.IS_MAINNET
      );
      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }
  //Schedule a cancel for a given time (in ms) //Note: Only available once you've traded $1 000 000 in volume
  async scheduleCancel(time) {
    try {
      const action = { type: "scheduleCancel" /* SCHEDULE_CANCEL */, time };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.IS_MAINNET
      );
      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }
  //Transfer between vault and perpetual wallets (intra-account transfer)
  async vaultTransfer(vaultAddress, isDeposit, usd) {
    try {
      const action = {
        type: "vaultTransfer" /* VAULT_TRANSFER */,
        vaultAddress,
        isDeposit,
        usd
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.IS_MAINNET
      );
      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }
  async setReferrer(code) {
    try {
      const action = {
        type: "setReferrer" /* SET_REFERRER */,
        code
      };
      const nonce = Date.now();
      const signature = await signL1Action(
        this.wallet,
        action,
        null,
        nonce,
        this.IS_MAINNET
      );
      const payload = { action, nonce, signature };
      return this.httpApi.makeRequest(payload, 1);
    } catch (error) {
      throw error;
    }
  }
};

// src/rest/info/general.ts
var GeneralInfoAPI = class {
  httpApi;
  symbolConversion;
  constructor(httpApi, symbolConversion) {
    this.httpApi = httpApi;
    this.symbolConversion = symbolConversion;
  }
  async getAllMids(rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "allMids" /* ALL_MIDS */ });
    if (rawResponse) {
      return response;
    } else {
      const convertedResponse = {};
      for (const [key, value] of Object.entries(response)) {
        const convertedKey = await this.symbolConversion.convertSymbol(key);
        const convertedValue = parseFloat(value);
        convertedResponse[convertedKey] = convertedValue;
      }
      return convertedResponse;
    }
  }
  async getUserOpenOrders(user, rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "openOrders" /* OPEN_ORDERS */, user });
    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }
  async getFrontendOpenOrders(user, rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "frontendOpenOrders" /* FRONTEND_OPEN_ORDERS */, user }, 20);
    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }
  async getUserFills(user, rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "userFills" /* USER_FILLS */, user }, 20);
    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }
  async getUserFillsByTime(user, startTime, endTime, rawResponse = false) {
    let params = {
      user,
      startTime: Math.round(startTime),
      type: "userFillsByTime" /* USER_FILLS_BY_TIME */
    };
    if (endTime) {
      params.endTime = Math.round(endTime);
    }
    const response = await this.httpApi.makeRequest(params, 20);
    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }
  async getUserRateLimit(user, rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "userRateLimit" /* USER_RATE_LIMIT */, user }, 20);
    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }
  async getOrderStatus(user, oid, rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "orderStatus" /* ORDER_STATUS */, user, oid });
    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }
  async getL2Book(coin, rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "l2Book" /* L2_BOOK */, coin: await this.symbolConversion.convertSymbol(coin, "reverse") });
    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }
  async getCandleSnapshot(coin, interval, startTime, endTime, rawResponse = false) {
    const response = await this.httpApi.makeRequest({
      type: "candleSnapshot" /* CANDLE_SNAPSHOT */,
      req: { coin: await this.symbolConversion.convertSymbol(coin, "reverse"), interval, startTime, endTime }
    });
    return rawResponse ? response : await this.symbolConversion.convertResponse(response, ["s"]);
  }
};

// src/rest/info/spot.ts
var SpotInfoAPI = class {
  httpApi;
  symbolConversion;
  constructor(httpApi, symbolConversion) {
    this.httpApi = httpApi;
    this.symbolConversion = symbolConversion;
  }
  async getSpotMeta(rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "spotMeta" /* SPOT_META */ });
    return rawResponse ? response : await this.symbolConversion.convertResponse(response, ["name", "coin", "symbol"], "SPOT");
  }
  async getSpotClearinghouseState(user, rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "spotClearinghouseState" /* SPOT_CLEARINGHOUSE_STATE */, user });
    return rawResponse ? response : await this.symbolConversion.convertResponse(response, ["name", "coin", "symbol"], "SPOT");
  }
  async getSpotMetaAndAssetCtxs(rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "spotMetaAndAssetCtxs" /* SPOT_META_AND_ASSET_CTXS */ });
    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }
};

// src/rest/info/perpetuals.ts
var PerpetualsInfoAPI = class {
  httpApi;
  symbolConversion;
  constructor(httpApi, symbolConversion) {
    this.httpApi = httpApi;
    this.symbolConversion = symbolConversion;
  }
  async getMeta(rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "meta" /* META */ });
    return rawResponse ? response : await this.symbolConversion.convertResponse(response, ["name", "coin", "symbol"], "PERP");
  }
  async getMetaAndAssetCtxs(rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "metaAndAssetCtxs" /* PERPS_META_AND_ASSET_CTXS */ });
    return rawResponse ? response : await this.symbolConversion.convertResponse(response, ["name", "coin", "symbol"], "PERP");
  }
  async getClearinghouseState(user, rawResponse = false) {
    const response = await this.httpApi.makeRequest({ type: "clearinghouseState" /* PERPS_CLEARINGHOUSE_STATE */, user });
    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }
  async getUserFunding(user, startTime, endTime, rawResponse = false) {
    const response = await this.httpApi.makeRequest({
      type: "userFunding" /* USER_FUNDING */,
      user,
      startTime,
      endTime
    }, 20);
    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }
  async getUserNonFundingLedgerUpdates(user, startTime, endTime, rawResponse = false) {
    const response = await this.httpApi.makeRequest({
      type: "userNonFundingLedgerUpdates" /* USER_NON_FUNDING_LEDGER_UPDATES */,
      user,
      startTime,
      endTime
    }, 20);
    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }
  async getFundingHistory(coin, startTime, endTime, rawResponse = false) {
    const response = await this.httpApi.makeRequest({
      type: "fundingHistory" /* FUNDING_HISTORY */,
      coin: await this.symbolConversion.convertSymbol(coin, "reverse"),
      startTime,
      endTime
    }, 20);
    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }
};

// src/rest/info.ts
var InfoAPI = class {
  spot;
  perpetuals;
  httpApi;
  generalAPI;
  symbolConversion;
  constructor(baseURL, rateLimiter, symbolConversion) {
    this.httpApi = new HttpApi(baseURL, ENDPOINTS.INFO, rateLimiter);
    this.symbolConversion = symbolConversion;
    this.generalAPI = new GeneralInfoAPI(this.httpApi, this.symbolConversion);
    this.spot = new SpotInfoAPI(this.httpApi, this.symbolConversion);
    this.perpetuals = new PerpetualsInfoAPI(this.httpApi, this.symbolConversion);
  }
  async getAssetIndex(assetName) {
    return await this.symbolConversion.getAssetIndex(assetName);
  }
  async getInternalName(exchangeName) {
    return await this.symbolConversion.convertSymbol(exchangeName);
  }
  async getAllAssets() {
    return await this.symbolConversion.getAllAssets();
  }
  async getAllMids(rawResponse = false) {
    return this.generalAPI.getAllMids(rawResponse);
  }
  async getUserOpenOrders(user, rawResponse = false) {
    return this.generalAPI.getUserOpenOrders(user, rawResponse);
  }
  async getFrontendOpenOrders(user, rawResponse = false) {
    return this.generalAPI.getFrontendOpenOrders(user, rawResponse);
  }
  async getUserFills(user, rawResponse = false) {
    return this.generalAPI.getUserFills(user, rawResponse);
  }
  async getUserFillsByTime(user, startTime, endTime, rawResponse = false) {
    return this.generalAPI.getUserFillsByTime(user, startTime, endTime, rawResponse);
  }
  async getUserRateLimit(user, rawResponse = false) {
    return this.generalAPI.getUserRateLimit(user, rawResponse);
  }
  async getOrderStatus(user, oid, rawResponse = false) {
    return this.generalAPI.getOrderStatus(user, oid, rawResponse);
  }
  async getL2Book(coin, rawResponse = false) {
    return this.generalAPI.getL2Book(coin, rawResponse);
  }
  async getCandleSnapshot(coin, interval, startTime, endTime, rawResponse = false) {
    return this.generalAPI.getCandleSnapshot(coin, interval, startTime, endTime, rawResponse);
  }
};

// src/utils/rateLimiter.ts
var RateLimiter = class {
  tokens;
  lastRefill;
  capacity;
  constructor() {
    this.capacity = 1200;
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
  refillTokens() {
    const now = Date.now();
    const elapsedMinutes = (now - this.lastRefill) / (1e3 * 60);
    if (elapsedMinutes >= 1) {
      this.tokens = this.capacity;
      this.lastRefill = now;
    }
  }
  async waitForToken(weight = 1) {
    this.refillTokens();
    if (this.tokens >= weight) {
      this.tokens -= weight;
      return;
    }
    const waitTime = (60 - (Date.now() - this.lastRefill) / 1e3) * 1e3;
    return new Promise((resolve) => setTimeout(resolve, waitTime)).then(() => {
      this.refillTokens();
      return this.waitForToken(weight);
    });
  }
};

// src/utils/symbolConversion.ts
var SymbolConversion = class {
  assetToIndexMap = /* @__PURE__ */ new Map();
  exchangeToInternalNameMap = /* @__PURE__ */ new Map();
  httpApi;
  refreshIntervalMs = 6e4;
  refreshInterval = null;
  initializationPromise;
  constructor(baseURL, rateLimiter) {
    this.httpApi = new HttpApi(baseURL, ENDPOINTS.INFO, rateLimiter);
    this.initializationPromise = this.initialize();
  }
  async initialize() {
    await this.refreshAssetMaps();
    this.startPeriodicRefresh();
  }
  async refreshAssetMaps() {
    try {
      const [perpMeta, spotMeta] = await Promise.all([
        this.httpApi.makeRequest({
          type: "metaAndAssetCtxs" /* PERPS_META_AND_ASSET_CTXS */
        }),
        this.httpApi.makeRequest({
          type: "spotMetaAndAssetCtxs" /* SPOT_META_AND_ASSET_CTXS */
        })
      ]);
      this.assetToIndexMap.clear();
      this.exchangeToInternalNameMap.clear();
      perpMeta[0].universe.forEach((asset, index) => {
        const internalName = `${asset.name}-PERP`;
        this.assetToIndexMap.set(internalName, index);
        this.exchangeToInternalNameMap.set(asset.name, internalName);
      });
      spotMeta[0].tokens.forEach((token) => {
        const universeItem = spotMeta[0].universe.find(
          (item) => item.tokens[0] === token.index
        );
        if (universeItem) {
          const internalName = `${token.name}-SPOT`;
          const exchangeName = universeItem.name;
          const index = spotMeta[0].universe.indexOf(universeItem);
          this.assetToIndexMap.set(internalName, 1e4 + index);
          this.exchangeToInternalNameMap.set(exchangeName, internalName);
        }
      });
    } catch (error) {
      console.error("Failed to refresh asset maps:", error);
    }
  }
  startPeriodicRefresh() {
    this.refreshInterval = setInterval(() => {
      this.refreshAssetMaps();
    }, this.refreshIntervalMs);
  }
  stopPeriodicRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
  async ensureInitialized() {
    await this.initializationPromise;
  }
  async getInternalName(exchangeName) {
    await this.ensureInitialized();
    return this.exchangeToInternalNameMap.get(exchangeName);
  }
  async getExchangeName(internalName) {
    await this.ensureInitialized();
    for (const [
      exchangeName,
      name
    ] of this.exchangeToInternalNameMap.entries()) {
      if (name === internalName) {
        return exchangeName;
      }
    }
    return void 0;
  }
  async getAssetIndex(assetSymbol) {
    await this.ensureInitialized();
    return this.assetToIndexMap.get(assetSymbol);
  }
  async getAllAssets() {
    await this.ensureInitialized();
    const perp = [];
    const spot = [];
    for (const [asset, index] of this.assetToIndexMap.entries()) {
      if (asset.endsWith("-PERP")) {
        perp.push(asset);
      } else if (asset.endsWith("-SPOT")) {
        spot.push(asset);
      }
    }
    return { perp, spot };
  }
  async convertSymbol(symbol, mode = "", symbolMode = "") {
    await this.ensureInitialized();
    let rSymbol;
    if (mode === "reverse") {
      for (const [key, value] of this.exchangeToInternalNameMap.entries()) {
        if (value === symbol) {
          return key;
        }
      }
      rSymbol = symbol;
    } else {
      rSymbol = this.exchangeToInternalNameMap.get(symbol) || symbol;
    }
    if (symbolMode === "SPOT") {
      if (!rSymbol.endsWith("-SPOT")) {
        rSymbol = symbol + "-SPOT";
      }
    } else if (symbolMode === "PERP") {
      if (!rSymbol.endsWith("-PERP")) {
        rSymbol = symbol + "-PERP";
      }
    }
    return rSymbol;
  }
  async convertSymbolsInObject(obj, symbolsFields = ["coin", "symbol"], symbolMode = "") {
    await this.ensureInitialized();
    if (typeof obj !== "object" || obj === null) {
      return this.convertToNumber(obj);
    }
    if (Array.isArray(obj)) {
      return Promise.all(
        obj.map(
          (item) => this.convertSymbolsInObject(item, symbolsFields, symbolMode)
        )
      );
    }
    const convertedObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (symbolsFields.includes(key)) {
        convertedObj[key] = await this.convertSymbol(
          value,
          "",
          symbolMode
        );
      } else if (key === "side") {
        convertedObj[key] = value === "A" ? "sell" : value === "B" ? "buy" : value;
      } else {
        convertedObj[key] = await this.convertSymbolsInObject(
          value,
          symbolsFields,
          symbolMode
        );
      }
    }
    return convertedObj;
  }
  convertToNumber(value) {
    if (typeof value === "string") {
      if (/^-?\d+$/.test(value)) {
        return parseInt(value, 10);
      } else if (/^-?\d*\.\d+$/.test(value)) {
        return parseFloat(value);
      }
    }
    return value;
  }
  async convertResponse(response, symbolsFields = ["coin", "symbol"], symbolMode = "") {
    return this.convertSymbolsInObject(response, symbolsFields, symbolMode);
  }
};

// src/websocket/connection.ts
import WebSocket from "ws";
import { EventEmitter } from "events";
var WebSocketClient = class extends EventEmitter {
  ws = null;
  url;
  pingInterval = null;
  reconnectAttempts = 0;
  maxReconnectAttempts = 5;
  reconnectDelay = 5e3;
  initialReconnectDelay = 1e3;
  maxReconnectDelay = 3e4;
  constructor(testnet = false) {
    super();
    this.url = testnet ? WSS_URLS.TESTNET : WSS_URLS.PRODUCTION;
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.on("open", () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
        this.startPingInterval();
        resolve();
      });
      this.ws.on("message", (data) => {
        const message = JSON.parse(data.toString());
        this.emit("message", message);
      });
      this.ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      });
      this.ws.on("close", () => {
        console.log("WebSocket disconnected");
        this.stopPingInterval();
        this.reconnect();
      });
    });
  }
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.initialReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      );
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error("Max reconnection attempts reached. Please reconnect manually.");
      this.emit("maxReconnectAttemptsReached");
    }
  }
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      this.sendMessage({ method: "ping" });
    }, 15e3);
  }
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  sendMessage(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    this.ws.send(JSON.stringify(message));
  }
  close() {
    if (this.ws) {
      this.ws.close();
    }
    this.stopPingInterval();
  }
};

// src/websocket/subscriptions.ts
var WebSocketSubscriptions = class {
  ws;
  symbolConversion;
  constructor(ws, symbolConversion) {
    this.ws = ws;
    this.symbolConversion = symbolConversion;
  }
  async subscribe(subscription) {
    await this.ws.sendMessage({ method: "subscribe", subscription });
  }
  async unsubscribe(subscription) {
    const convertedSubscription = await this.symbolConversion.convertSymbolsInObject(subscription);
    await this.ws.sendMessage({ method: "unsubscribe", subscription: convertedSubscription });
  }
  handleMessage(message, callback, channel, additionalChecks = () => true) {
    if (typeof message !== "object" || message === null) {
      console.warn("Received invalid message format:", message);
      return;
    }
    let data = message.data || message;
    if (data.channel === channel && additionalChecks(data)) {
      const convertedData = this.symbolConversion.convertSymbolsInObject(data);
      callback(convertedData);
    }
  }
  async subscribeToAllMids(callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }
    this.subscribe({ type: "allMids" });
    this.ws.on("message", async (message) => {
      if (message.channel === "allMids") {
        if (message.data.mids) {
          const convertedData = {};
          for (const [key, value] of Object.entries(message.data.mids)) {
            const convertedKey = await this.symbolConversion.convertSymbol(key);
            const convertedValue = this.symbolConversion.convertToNumber(value);
            convertedData[convertedKey] = convertedValue;
          }
          callback(convertedData);
        }
      }
    });
  }
  async subscribeToNotification(user, callback) {
    this.subscribe({ type: "notification", user });
    this.ws.on("message", async (message) => {
      if (message.channel === "notification") {
        message = await this.symbolConversion.convertSymbolsInObject(message);
        callback(message.data);
      }
    });
  }
  async subscribeToWebData2(user, callback) {
    this.subscribe({ type: "webData2", user });
    this.ws.on("message", async (message) => {
      if (message.channel === "webData2") {
        message = await this.symbolConversion.convertSymbolsInObject(message);
        callback(message.data);
      }
    });
  }
  async subscribeToCandle(coin, interval, callback) {
    const convertedCoin = await this.symbolConversion.convertSymbol(coin, "reverse");
    this.subscribe({ type: "candle", coin: convertedCoin, interval });
    this.ws.on("message", async (message) => {
      if (message.channel === "candle" && message.data.s === convertedCoin && message.data.i === interval) {
        message = await this.symbolConversion.convertSymbolsInObject(message, ["s"]);
        callback(message.data);
      }
    });
  }
  async subscribeToL2Book(coin, callback) {
    const convertedCoin = await this.symbolConversion.convertSymbol(coin, "reverse");
    this.subscribe({ type: "l2Book", coin: convertedCoin });
    this.ws.on("message", async (message) => {
      if (message.channel === "l2Book" && message.data.coin === convertedCoin) {
        message = await this.symbolConversion.convertSymbolsInObject(message, ["coin"]);
        callback(message.data);
      }
    });
  }
  async subscribeToTrades(coin, callback) {
    const convertedCoin = await this.symbolConversion.convertSymbol(coin, "reverse");
    this.subscribe({ type: "trades", coin: convertedCoin });
    this.ws.on("message", async (message) => {
      if (message.channel === "trades" && message.data[0].coin === convertedCoin) {
        message = await this.symbolConversion.convertSymbolsInObject(message, ["coin"]);
        callback(message.data);
      }
    });
  }
  async subscribeToOrderUpdates(user, callback) {
    this.subscribe({ type: "orderUpdates", user });
    this.ws.on("message", async (message) => {
      if (message.channel === "orderUpdates") {
        message = await this.symbolConversion.convertSymbolsInObject(message);
        callback(message.data);
      }
    });
  }
  async subscribeToUserEvents(user, callback) {
    this.subscribe({ type: "userEvents", user });
    this.ws.on("message", async (message) => {
      if (message.channel === "userEvents") {
        message = await this.symbolConversion.convertSymbolsInObject(message);
        callback(message.data);
      }
    });
  }
  async subscribeToUserFills(user, callback) {
    this.subscribe({ type: "userFills", user });
    this.ws.on("message", async (message) => {
      if (message.channel === "userFills") {
        message = await this.symbolConversion.convertSymbolsInObject(message);
        callback(message.data);
      }
    });
  }
  async subscribeToUserFundings(user, callback) {
    this.subscribe({ type: "userFundings", user });
    this.ws.on("message", async (message) => {
      if (message.channel === "userFundings") {
        message = await this.symbolConversion.convertSymbolsInObject(message);
        callback(message.data);
      }
    });
  }
  async subscribeToUserNonFundingLedgerUpdates(user, callback) {
    this.subscribe({ type: "userNonFundingLedgerUpdates", user });
    this.ws.on("message", async (message) => {
      if (message.channel === "userNonFundingLedgerUpdates") {
        message = await this.symbolConversion.convertSymbolsInObject(message);
        callback(message.data);
      }
    });
  }
  async postRequest(requestType, payload) {
    const id = Date.now();
    const convertedPayload = await this.symbolConversion.convertSymbolsInObject(payload);
    await this.ws.sendMessage({
      method: "post",
      id,
      request: {
        type: requestType,
        payload: convertedPayload
      }
    });
    return new Promise((resolve, reject) => {
      const responseHandler = (message) => {
        if (typeof message === "object" && message !== null) {
          const data = message.data || message;
          if (data.channel === "post" && data.id === id) {
            this.ws.removeListener("message", responseHandler);
            if (data.response && data.response.type === "error") {
              reject(new Error(data.response.payload));
            } else {
              const convertedResponse = this.symbolConversion.convertSymbolsInObject(data.response ? data.response.payload : data);
              resolve(convertedResponse);
            }
          }
        }
      };
      this.ws.on("message", responseHandler);
      setTimeout(() => {
        this.ws.removeListener("message", responseHandler);
        reject(new Error("Request timeout"));
      }, 3e4);
    });
  }
  async unsubscribeFromAllMids() {
    this.unsubscribe({ type: "allMids" });
  }
  async unsubscribeFromNotification(user) {
    this.unsubscribe({ type: "notification", user });
  }
  async unsubscribeFromWebData2(user) {
    this.unsubscribe({ type: "webData2", user });
  }
  async unsubscribeFromCandle(coin, interval) {
    this.unsubscribe({ type: "candle", coin, interval });
  }
  async unsubscribeFromL2Book(coin) {
    this.unsubscribe({ type: "l2Book", coin });
  }
  async unsubscribeFromTrades(coin) {
    this.unsubscribe({ type: "trades", coin });
  }
  async unsubscribeFromOrderUpdates(user) {
    this.unsubscribe({ type: "orderUpdates", user });
  }
  async unsubscribeFromUserEvents(user) {
    this.unsubscribe({ type: "userEvents", user });
  }
  async unsubscribeFromUserFills(user) {
    this.unsubscribe({ type: "userFills", user });
  }
  async unsubscribeFromUserFundings(user) {
    this.unsubscribe({ type: "userFundings", user });
  }
  async unsubscribeFromUserNonFundingLedgerUpdates(user) {
    this.unsubscribe({ type: "userNonFundingLedgerUpdates", user });
  }
};

// src/index.ts
var Hyperliquid = class {
  info;
  exchange;
  ws;
  subscriptions;
  custom;
  rateLimiter;
  symbolConversion;
  isValidPrivateKey = false;
  walletAddress = null;
  constructor(privateKey = null, testnet = false, walletAddress = null) {
    const baseURL = testnet ? BASE_URLS.TESTNET : BASE_URLS.PRODUCTION;
    this.rateLimiter = new RateLimiter();
    this.symbolConversion = new SymbolConversion(baseURL, this.rateLimiter);
    this.info = new InfoAPI(baseURL, this.rateLimiter, this.symbolConversion);
    this.ws = new WebSocketClient(testnet);
    this.subscriptions = new WebSocketSubscriptions(
      this.ws,
      this.symbolConversion
    );
    this.exchange = this.createAuthenticatedProxy(ExchangeAPI);
    this.custom = this.createAuthenticatedProxy(CustomOperations);
    this.walletAddress = walletAddress;
    if (privateKey) {
      this.initializeWithPrivateKey(privateKey, testnet);
    }
  }
  createAuthenticatedProxy(Class) {
    return new Proxy({}, {
      get: (target, prop) => {
        if (!this.isValidPrivateKey) {
          throw new AuthenticationError(
            "Invalid or missing private key. This method requires authentication."
          );
        }
        return target[prop];
      }
    });
  }
  initializeWithPrivateKey(privateKey, testnet = false) {
    try {
      const formattedPrivateKey = privateKey.startsWith("0x") ? privateKey : `${privateKey}`;
      new ethers4.Wallet(formattedPrivateKey);
      this.exchange = new ExchangeAPI(
        testnet,
        formattedPrivateKey,
        this.info,
        this.rateLimiter,
        this.symbolConversion,
        this.walletAddress
      );
      this.custom = new CustomOperations(
        this.exchange,
        this.info,
        formattedPrivateKey,
        this.symbolConversion,
        this.walletAddress
      );
      this.isValidPrivateKey = true;
    } catch (error) {
      console.warn(
        "Invalid private key provided. Some functionalities will be limited."
      );
      this.isValidPrivateKey = false;
    }
  }
  isAuthenticated() {
    return this.isValidPrivateKey;
  }
  async connect() {
    await this.ws.connect();
    if (!this.isValidPrivateKey) {
      console.warn(
        "Not authenticated. Some WebSocket functionalities may be limited."
      );
    }
  }
  disconnect() {
    this.ws.close();
  }
};
export {
  Hyperliquid,
  cancelOrderToAction,
  floatToIntForHashing,
  floatToUsdInt,
  floatToWire,
  getTimestampMs,
  orderRequestToOrderWire,
  orderTypeToWire,
  orderWiresToOrderAction,
  signAgent,
  signL1Action,
  signUsdTransferAction,
  signUserSignedAction,
  signWithdrawFromBridgeAction
};
//# sourceMappingURL=index.js.map