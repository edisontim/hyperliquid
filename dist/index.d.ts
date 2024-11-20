import { Wallet, HDNodeWallet } from 'ethers';
import { EventEmitter } from 'events';

declare class RateLimiter {
    private tokens;
    private lastRefill;
    private readonly capacity;
    constructor();
    private refillTokens;
    waitForToken(weight?: number): Promise<void>;
}

type Tif = 'Alo' | 'Ioc' | 'Gtc';
type Tpsl = 'tp' | 'sl';
type LimitOrderType = {
    tif: Tif;
};
type TriggerOrderType = {
    triggerPx: string | number;
    isMarket: boolean;
    tpsl: Tpsl;
};
type Grouping = 'na' | 'normalTpsl' | 'positionTpsl';
type OrderType = {
    limit?: LimitOrderType;
    trigger?: TriggerOrderTypeWire;
};
type Cloid = string;
type OidOrCloid = number | Cloid;
interface AllMids {
    [coin: string]: string;
}
interface Meta {
    universe: {
        name: string;
        szDecimals: number;
        maxLeverage: number;
        onlyIsolated: boolean;
    }[];
}
interface ClearinghouseState {
    assetPositions: {
        position: {
            coin: string;
            cumFunding: {
                allTime: string;
                sinceChange: string;
                sinceOpen: string;
            };
            entryPx: string;
            leverage: {
                rawUsd: string;
                type: string;
                value: number;
            };
            liquidationPx: string;
            marginUsed: string;
            maxLeverage: number;
            positionValue: string;
            returnOnEquity: string;
            szi: string;
            unrealizedPnl: string;
        };
        type: string;
    }[];
    crossMaintenanceMarginUsed: string;
    crossMarginSummary: {
        accountValue: string;
        totalMarginUsed: string;
        totalNtlPos: string;
        totalRawUsd: string;
    };
    marginSummary: {
        accountValue: string;
        totalMarginUsed: string;
        totalNtlPos: string;
        totalRawUsd: string;
    };
    time: number;
    withdrawable: string;
}
interface OrderResponse {
    status: string;
    response: {
        type: string;
        data: {
            statuses: Array<{
                resting?: {
                    oid: number;
                };
                filled?: {
                    oid: number;
                };
            }>;
        };
    };
}
interface WsTrade {
    coin: string;
    side: string;
    px: string;
    sz: string;
    hash: string;
    time: number;
    tid: number;
}
interface WsBook {
    coin: string;
    levels: [Array<WsLevel>, Array<WsLevel>];
    time: number;
}
interface WsLevel {
    px: string;
    sz: string;
    n: number;
}
interface WsOrder {
    order: {
        coin: string;
        side: string;
        limitPx: string;
        sz: string;
        oid: number;
        timestamp: number;
        origSz: string;
    };
    status: string;
    statusTimestamp: number;
    user: string;
}
type WsUserEvent = (WsFill[] | WsUserFunding | WsLiquidation | WsNonUserCancel[]) & {
    user: string;
};
interface WsFill {
    coin: string;
    px: string;
    sz: string;
    side: string;
    time: number;
    startPosition: string;
    dir: string;
    closedPnl: string;
    hash: string;
    oid: number;
    crossed: boolean;
    fee: string;
    tid: number;
}
interface WsLiquidation {
    lid: number;
    liquidator: string;
    liquidated_user: string;
    liquidated_ntl_pos: string;
    liquidated_account_value: string;
}
interface WsNonUserCancel {
    coin: string;
    oid: number;
}
interface SpotClearinghouseState {
    balances: {
        coin: string;
        hold: string;
        total: string;
    }[];
}
interface FrontendOpenOrders {
    coin: string;
    isPositionTpsl: boolean;
    isTrigger: boolean;
    limitPx: string;
    oid: number;
    orderType: string;
    origSz: string;
    reduceOnly: boolean;
    side: string;
    sz: string;
    timestamp: number;
    triggerCondition: string;
    triggerPx: string;
}
interface UserFills {
    closedPnl: string;
    coin: string;
    crossed: boolean;
    dir: string;
    hash: string;
    oid: number;
    px: string;
    side: string;
    startPosition: string;
    sz: string;
    time: number;
}
interface UserFills {
    closedPnl: string;
    coin: string;
    crossed: boolean;
    dir: string;
    hash: string;
    oid: number;
    px: string;
    side: string;
    startPosition: string;
    sz: string;
    time: number;
}
interface UserRateLimit {
    [key: string]: any;
}
interface OrderStatus {
    [key: string]: any;
}
interface L2Book {
    levels: [
        {
            px: string;
            sz: string;
            n: number;
        }[],
        {
            px: string;
            sz: string;
            n: number;
        }[]
    ];
}
interface CandleSnapshot {
    T: number;
    c: string;
    h: string;
    i: string;
    l: string;
    n: number;
    o: string;
    s: string;
    t: number;
    v: string;
}
interface AssetCtx {
    dayNtlVlm: string;
    funding: string;
    impactPxs: [string, string];
    markPx: string;
    midPx: string;
    openInterest: string;
    oraclePx: string;
    premium: string;
    prevDayPx: string;
}
interface MetaAndAssetCtxs {
    meta: Meta;
    assetCtxs: AssetCtx[];
}
interface UserFundingDelta {
    coin: string;
    fundingRate: string;
    szi: string;
    type: "funding";
    usdc: string;
}
interface UserFundingEntry {
    delta: UserFundingDelta;
    hash: string;
    time: number;
}
type UserFunding = UserFundingEntry[];
interface UserNonFundingLedgerDelta {
    coin: string;
    type: "deposit" | "withdraw" | "transfer" | "liquidation";
    usdc: string;
}
interface UserNonFundingLedgerEntry {
    delta: UserNonFundingLedgerDelta;
    hash: string;
    time: number;
}
type UserNonFundingLedgerUpdates = UserNonFundingLedgerEntry[];
interface FundingHistoryEntry {
    coin: string;
    fundingRate: string;
    premium: string;
    time: number;
}
type FundingHistory = FundingHistoryEntry[];
interface SpotToken {
    name: string;
    szDecimals: number;
    weiDecimals: number;
    index: number;
    tokenId: string;
    isCanonical: boolean;
}
interface SpotMarket {
    name: string;
    tokens: [number, number];
    index: number;
    isCanonical: boolean;
}
interface SpotMeta {
    tokens: SpotToken[];
    universe: SpotMarket[];
}
interface SpotAssetCtx {
    dayNtlVlm: string;
    markPx: string;
    midPx: string;
    prevDayPx: string;
}
interface SpotMetaAndAssetCtxs {
    meta: SpotMeta;
    assetCtxs: SpotAssetCtx[];
}
interface UserOpenOrder {
    coin: string;
    limitPx: string;
    oid: number;
    side: string;
    sz: string;
    timestamp: number;
}
type UserOpenOrders = UserOpenOrder[];
interface OrderRequest {
    coin: string;
    is_buy: boolean;
    sz: number;
    limit_px: number;
    order_type: OrderType;
    reduce_only: boolean;
    cloid?: Cloid;
    vaultAddress?: string;
}
interface OrderWire {
    a: number;
    b: boolean;
    p: string;
    s: string;
    r: boolean;
    t: OrderType;
    c?: string;
}
interface TriggerOrderTypeWire {
    triggerPx: number | string;
    isMarket: boolean;
    tpsl: Tpsl;
}
type OrderTypeWire = {
    limit?: LimitOrderType;
    trigger?: TriggerOrderTypeWire;
};
interface CancelOrderRequest {
    coin: string;
    o: number;
}
type CancelOrderRequests = {
    a: number;
    o: number;
}[];
interface CancelByCloidRequest {
    coin: string;
    cloid: Cloid;
}
interface ModifyRequest {
    oid: OidOrCloid;
    order: OrderRequest;
}
interface ModifyWire {
    oid: number;
    order: OrderWire;
}
interface ScheduleCancelAction {
    type: 'scheduleCancel';
    time?: number | null;
}
interface Signature {
    r: string;
    s: string;
    v: number;
}
interface Notification {
    notification: string;
    user: string;
}
interface WebData2 {
    [key: string]: any;
}
interface Candle {
    t: number;
    T: number;
    s: string;
    i: string;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    n: number;
    coin: string;
    interval: string;
}
interface WsUserFill {
    coin: string;
    px: string;
    sz: string;
    side: string;
    time: number;
    startPosition: string;
    dir: string;
    closedPnl: string;
    hash: string;
    oid: number;
    crossed: boolean;
    fee: string;
    tid: number;
}
type WsUserFills = {
    isSnapshot: boolean;
    fills: WsUserFill[];
    user: string;
};
interface WsUserFunding {
    time: number;
    coin: string;
    usdc: string;
    szi: string;
    fundingRate: string;
}
interface WsUserFunding {
    time: number;
    coin: string;
    usdc: string;
    szi: string;
    fundingRate: string;
}
type WsUserFundings = {
    isSnapshot: boolean;
    fundings: WsUserFunding[];
    user: string;
};
interface WsUserNonFundingLedgerUpdate {
    time: number;
    coin: string;
    usdc: string;
    type: 'deposit' | 'withdraw' | 'transfer' | 'liquidation';
}
type WsUserNonFundingLedgerUpdates = {
    isSnapshot: boolean;
    updates: WsUserNonFundingLedgerUpdate[];
    user: string;
};

declare class HttpApi {
    private client;
    private endpoint;
    private rateLimiter;
    constructor(baseUrl: string, endpoint: string | undefined, rateLimiter: RateLimiter);
    makeRequest(payload: any, weight?: number, endpoint?: string): Promise<any>;
}

declare class SymbolConversion {
    private assetToIndexMap;
    private exchangeToInternalNameMap;
    private httpApi;
    private refreshIntervalMs;
    private refreshInterval;
    private initializationPromise;
    constructor(baseURL: string, rateLimiter: any);
    private initialize;
    private refreshAssetMaps;
    private startPeriodicRefresh;
    stopPeriodicRefresh(): void;
    private ensureInitialized;
    getInternalName(exchangeName: string): Promise<string | undefined>;
    getExchangeName(internalName: string): Promise<string | undefined>;
    getAssetIndex(assetSymbol: string): Promise<number | undefined>;
    getAllAssets(): Promise<{
        perp: string[];
        spot: string[];
    }>;
    convertSymbol(symbol: string, mode?: string, symbolMode?: string): Promise<string>;
    convertSymbolsInObject(obj: any, symbolsFields?: Array<string>, symbolMode?: string): Promise<any>;
    convertToNumber(value: any): any;
    convertResponse(response: any, symbolsFields?: string[], symbolMode?: string): Promise<any>;
}

declare class SpotInfoAPI {
    private httpApi;
    private symbolConversion;
    constructor(httpApi: HttpApi, symbolConversion: SymbolConversion);
    getSpotMeta(rawResponse?: boolean): Promise<SpotMeta>;
    getSpotClearinghouseState(user: string, rawResponse?: boolean): Promise<SpotClearinghouseState>;
    getSpotMetaAndAssetCtxs(rawResponse?: boolean): Promise<SpotMetaAndAssetCtxs>;
}

declare class PerpetualsInfoAPI {
    private httpApi;
    private symbolConversion;
    constructor(httpApi: HttpApi, symbolConversion: SymbolConversion);
    getMeta(rawResponse?: boolean): Promise<Meta>;
    getMetaAndAssetCtxs(rawResponse?: boolean): Promise<MetaAndAssetCtxs>;
    getClearinghouseState(user: string, rawResponse?: boolean): Promise<ClearinghouseState>;
    getUserFunding(user: string, startTime: number, endTime?: number, rawResponse?: boolean): Promise<UserFunding>;
    getUserNonFundingLedgerUpdates(user: string, startTime: number, endTime?: number, rawResponse?: boolean): Promise<UserNonFundingLedgerUpdates>;
    getFundingHistory(coin: string, startTime: number, endTime?: number, rawResponse?: boolean): Promise<FundingHistory>;
}

declare class InfoAPI {
    spot: SpotInfoAPI;
    perpetuals: PerpetualsInfoAPI;
    private httpApi;
    private generalAPI;
    private symbolConversion;
    constructor(baseURL: string, rateLimiter: RateLimiter, symbolConversion: SymbolConversion);
    getAssetIndex(assetName: string): Promise<number | undefined>;
    getInternalName(exchangeName: string): Promise<string | undefined>;
    getAllAssets(): Promise<{
        perp: string[];
        spot: string[];
    }>;
    getAllMids(rawResponse?: boolean): Promise<AllMids>;
    getUserOpenOrders(user: string, rawResponse?: boolean): Promise<UserOpenOrders>;
    getFrontendOpenOrders(user: string, rawResponse?: boolean): Promise<FrontendOpenOrders>;
    getUserFills(user: string, rawResponse?: boolean): Promise<UserFills>;
    getUserFillsByTime(user: string, startTime: number, endTime: number, rawResponse?: boolean): Promise<UserFills>;
    getUserRateLimit(user: string, rawResponse?: boolean): Promise<UserRateLimit>;
    getOrderStatus(user: string, oid: number | string, rawResponse?: boolean): Promise<OrderStatus>;
    getL2Book(coin: string, rawResponse?: boolean): Promise<L2Book>;
    getCandleSnapshot(coin: string, interval: string, startTime: number, endTime: number, rawResponse?: boolean): Promise<CandleSnapshot>;
}

declare function orderTypeToWire(orderType: OrderType): OrderType;
declare function signL1Action(wallet: Wallet | HDNodeWallet, action: unknown, activePool: string | null, nonce: number, isMainnet: boolean): Promise<Signature>;
declare function signUserSignedAction(wallet: Wallet, action: any, payloadTypes: Array<{
    name: string;
    type: string;
}>, primaryType: string, isMainnet: boolean): Promise<Signature>;
declare function signUsdTransferAction(wallet: Wallet, action: any, isMainnet: boolean): Promise<Signature>;
declare function signWithdrawFromBridgeAction(wallet: Wallet, action: any, isMainnet: boolean): Promise<Signature>;
declare function signAgent(wallet: Wallet, action: any, isMainnet: boolean): Promise<Signature>;
declare function floatToWire(x: number): string;
declare function floatToIntForHashing(x: number): number;
declare function floatToUsdInt(x: number): number;
declare function getTimestampMs(): number;
declare function orderRequestToOrderWire(order: OrderRequest, asset: number): OrderWire;
interface CancelOrderResponse {
    status: string;
    response: {
        type: string;
        data: {
            statuses: string[];
        };
    };
}
declare function cancelOrderToAction(cancelRequest: CancelOrderRequest): any;
declare function orderWiresToOrderAction(orderWires: OrderWire[]): any;

declare class ExchangeAPI {
    private info;
    private wallet;
    private httpApi;
    private symbolConversion;
    private IS_MAINNET;
    private walletAddress;
    constructor(testnet: boolean, privateKey: string, info: InfoAPI, rateLimiter: RateLimiter, symbolConversion: SymbolConversion, walletAddress?: string | null);
    private getAssetIndex;
    placeOrder(orderRequest: OrderRequest): Promise<any>;
    cancelOrder(cancelRequests: CancelOrderRequest | CancelOrderRequest[]): Promise<CancelOrderResponse>;
    cancelOrderByCloid(symbol: string, cloid: string): Promise<any>;
    modifyOrder(oid: number, orderRequest: OrderRequest): Promise<any>;
    batchModifyOrders(modifies: Array<{
        oid: number;
        order: OrderRequest;
    }>): Promise<any>;
    updateLeverage(symbol: string, leverageMode: string, leverage: number): Promise<any>;
    updateIsolatedMargin(symbol: string, isBuy: boolean, ntli: number): Promise<any>;
    usdTransfer(destination: string, amount: number): Promise<any>;
    spotTransfer(destination: string, token: string, amount: string): Promise<any>;
    initiateWithdrawal(destination: string, amount: number): Promise<any>;
    transferBetweenSpotAndPerp(usdc: number, toPerp: boolean): Promise<any>;
    scheduleCancel(time: number | null): Promise<any>;
    vaultTransfer(vaultAddress: string, isDeposit: boolean, usd: number): Promise<any>;
    setReferrer(code: string): Promise<any>;
}

declare class CustomOperations {
    private exchange;
    private infoApi;
    private wallet;
    private symbolConversion;
    private walletAddress;
    constructor(exchange: ExchangeAPI, infoApi: InfoAPI, privateKey: string, symbolConversion: SymbolConversion, walletAddress?: string | null);
    cancelAllOrders(symbol?: string): Promise<CancelOrderResponse>;
    getAllAssets(): Promise<{
        perp: string[];
        spot: string[];
    }>;
    private DEFAULT_SLIPPAGE;
    private getSlippagePrice;
    marketOpen(symbol: string, isBuy: boolean, size: number, px?: number, slippage?: number, cloid?: string): Promise<OrderResponse>;
    marketClose(symbol: string, size?: number, px?: number, slippage?: number, cloid?: string): Promise<OrderResponse>;
    closeAllPositions(slippage?: number): Promise<OrderResponse[]>;
}

declare class WebSocketClient extends EventEmitter {
    private ws;
    private url;
    private pingInterval;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private initialReconnectDelay;
    private maxReconnectDelay;
    constructor(testnet?: boolean);
    connect(): Promise<void>;
    private reconnect;
    private startPingInterval;
    private stopPingInterval;
    sendMessage(message: any): void;
    close(): void;
}

declare class WebSocketSubscriptions {
    private ws;
    private symbolConversion;
    constructor(ws: WebSocketClient, symbolConversion: SymbolConversion);
    private subscribe;
    private unsubscribe;
    private handleMessage;
    subscribeToAllMids(callback: (data: AllMids) => void): Promise<void>;
    subscribeToNotification(user: string, callback: (data: Notification & {
        user: string;
    }) => void): Promise<void>;
    subscribeToWebData2(user: string, callback: (data: WebData2) => void): Promise<void>;
    subscribeToCandle(coin: string, interval: string, callback: (data: Candle[] & {
        coin: string;
        interval: string;
    }) => void): Promise<void>;
    subscribeToL2Book(coin: string, callback: (data: WsBook & {
        coin: string;
    }) => void): Promise<void>;
    subscribeToTrades(coin: string, callback: (data: any) => void): Promise<void>;
    subscribeToOrderUpdates(user: string, callback: (data: WsOrder[] & {
        user: string;
    }) => void): Promise<void>;
    subscribeToUserEvents(user: string, callback: (data: WsUserEvent & {
        user: string;
    }) => void): Promise<void>;
    subscribeToUserFills(user: string, callback: (data: WsUserFills & {
        user: string;
    }) => void): Promise<void>;
    subscribeToUserFundings(user: string, callback: (data: WsUserFundings & {
        user: string;
    }) => void): Promise<void>;
    subscribeToUserNonFundingLedgerUpdates(user: string, callback: (data: WsUserNonFundingLedgerUpdates & {
        user: string;
    }) => void): Promise<void>;
    postRequest(requestType: 'info' | 'action', payload: any): Promise<any>;
    unsubscribeFromAllMids(): Promise<void>;
    unsubscribeFromNotification(user: string): Promise<void>;
    unsubscribeFromWebData2(user: string): Promise<void>;
    unsubscribeFromCandle(coin: string, interval: string): Promise<void>;
    unsubscribeFromL2Book(coin: string): Promise<void>;
    unsubscribeFromTrades(coin: string): Promise<void>;
    unsubscribeFromOrderUpdates(user: string): Promise<void>;
    unsubscribeFromUserEvents(user: string): Promise<void>;
    unsubscribeFromUserFills(user: string): Promise<void>;
    unsubscribeFromUserFundings(user: string): Promise<void>;
    unsubscribeFromUserNonFundingLedgerUpdates(user: string): Promise<void>;
}

declare class Hyperliquid {
    info: InfoAPI;
    exchange: ExchangeAPI;
    ws: WebSocketClient;
    subscriptions: WebSocketSubscriptions;
    custom: CustomOperations;
    private rateLimiter;
    private symbolConversion;
    private isValidPrivateKey;
    private walletAddress;
    constructor(privateKey?: string | null, testnet?: boolean, walletAddress?: string | null);
    private createAuthenticatedProxy;
    private initializeWithPrivateKey;
    isAuthenticated(): boolean;
    connect(): Promise<void>;
    disconnect(): void;
}

export { type AllMids, type AssetCtx, type CancelByCloidRequest, type CancelOrderRequest, type CancelOrderRequests, type CancelOrderResponse, type Candle, type CandleSnapshot, type ClearinghouseState, type Cloid, type FrontendOpenOrders, type FundingHistory, type FundingHistoryEntry, type Grouping, Hyperliquid, type L2Book, type LimitOrderType, type Meta, type MetaAndAssetCtxs, type ModifyRequest, type ModifyWire, type Notification, type OidOrCloid, type OrderRequest, type OrderResponse, type OrderStatus, type OrderType, type OrderTypeWire, type OrderWire, type ScheduleCancelAction, type Signature, type SpotAssetCtx, type SpotClearinghouseState, type SpotMarket, type SpotMeta, type SpotMetaAndAssetCtxs, type SpotToken, type Tif, type Tpsl, type TriggerOrderType, type TriggerOrderTypeWire, type UserFills, type UserFunding, type UserFundingDelta, type UserFundingEntry, type UserNonFundingLedgerDelta, type UserNonFundingLedgerEntry, type UserNonFundingLedgerUpdates, type UserOpenOrder, type UserOpenOrders, type UserRateLimit, type WebData2, type WsBook, type WsFill, type WsLevel, type WsLiquidation, type WsNonUserCancel, type WsOrder, type WsTrade, type WsUserEvent, type WsUserFill, type WsUserFills, type WsUserFunding, type WsUserFundings, type WsUserNonFundingLedgerUpdate, type WsUserNonFundingLedgerUpdates, cancelOrderToAction, floatToIntForHashing, floatToUsdInt, floatToWire, getTimestampMs, orderRequestToOrderWire, orderTypeToWire, orderWiresToOrderAction, signAgent, signL1Action, signUsdTransferAction, signUserSignedAction, signWithdrawFromBridgeAction };
