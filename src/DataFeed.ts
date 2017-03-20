import {get, RequestResponse} from "request";
/**
 * Class which respresents a single value data feed. 
 * The sole purpose of this class is to perform request to given URI on a network 
 * resource within given interval and inform all insterested parties as new data 
 * is received or error is encountered.
 * @author Jānis Radiņš
 */
export class DataFeed {

    private dataListeners:DataListener[] = [];
    private errorListeners:DataListener[] = [];
    private updateTimeoutId:any;

    private _running:boolean = false;
    private _data:any;
    private _dataTime:number;

    /**
     * Create new data feed instance.
     * @param uri URI of data source.
     * @param updateInterval Data update interval in miliseconds.
     */
    constructor(public readonly uri:string, 
                public readonly updateInterval:number) {
        
    }

    //---------------------------------
    // Public properties
    //---------------------------------
    
    /**
     * Boolean flag which indicates that data feed is currently activated (value true) and 
     * incoming data should be available within update interval, or data feed is not started 
     * or already stopped (value false).
     */
    get running():boolean {
        return this._running;
    }

    /**
     * Last known incoming data acquired from data source or undefined in case if not data is 
     * received.
     */
    get data():any {
        return this._data;
    }

    /**
     * Time as epoch of last valid incming data.
     */
    get dataTime():any {
        return this._dataTime;
    }

    //---------------------------------
    // Public methods
    //---------------------------------

    /**
     * Start listening for data feed.
     * (Call to this method as data feed listening is already started will be taken as error)
     */
    start():void {
        if (this._running) {
            throw `This data feed (${this.uri}) is already running`;
        }
        this._running = true;
        this.createRequest();
    }

    /**
     * Stop listening for data feed.
     * (Call to this method as data feed listening is already stopped or is not started will be taken as error)
     */
    stop():void {
        if (!this._running) {
            throw `This data source (${this.uri}) is not running and cannot be stopped`;
        }
        this._running = false;
        if (this.updateTimeoutId) {
            //Cancel next data update request, if there is any
            clearTimeout(this.updateTimeoutId);
            this.updateTimeoutId = null;
        }
    }

    /**
     * Add data update listener.
     * @param listener Listener that shall be invoked as this data source receives update.
     */
    addDataUpdateListener(listener:DataListener):void {
        if(this.dataListeners.indexOf(listener) !== -1) {
            throw "Listener is already assigned";
        }
        this.dataListeners.push(listener);
    }

    /**
     * Add data error listener.
     * @param listener Listener that shall be invoked as this data source encounters a network error.
     */
    addDataErrorListener(listener:DataListener):void {
        if(this.errorListeners.indexOf(listener) !== -1) {
            throw "Listener is already assigned";
        }

        this.errorListeners.push(listener);
    }

    //---------------------------------
    // Private methods
    //---------------------------------

    /**
     * Create next data request.
     */
    private createRequest():void {
        get(
            this.uri + `?noCache=${Math.round(Math.random() * 0xFFFFFF).toString(16)}`, 
            (error:any, response:RequestResponse, body:string) => this.dataHandler(error, response, body)
        );
    }

    /**
     * Handle incoming data.
     */
    private dataHandler(error:any, response:RequestResponse, body:string):void {
        if (error || !response || response.statusCode !== 200) {
            console.error(`Data source ${this.uri} has error.`);
            //Inform all interested parties that we have got an error
            this.errorListeners.forEach(listener => listener(this));
        } else {
            this._data = JSON.parse(body);
            this._dataTime = Date.now();
            // console.log('data:', this._data);
            //Inform all interested parties that we have got a data
            this.dataListeners.forEach(listener => listener(this));
        }

        //Schedule next data update
        this.updateTimeoutId = setTimeout(() => {
            this.updateTimeoutId = null;
            this.createRequest();
        }, this.updateInterval);
    }
}

/**
 * Shape of DataFeed notification listener methods.
 */
export type DataListener = {
    (data?:DataFeed):void
}