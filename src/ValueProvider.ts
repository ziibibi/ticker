import {DataFeed} from "./DataFeed";
import {ValueType} from "./ValueType";
/**
 * Value provider class that will take DataFeed as a source and parse data of particular usage 
 * out of incoming data.
 * @author Jānis Radiņš
 */
export class ValueProvider {

    private updateListeners:UpdateListener[] = [];

    private _value:number;

    /**
     * Create new instance of ValueProvider.
     * @param type Data value type
     * @param dataSource Data source instance which should be used witihn this parser.
     * @param parser Definiton on how exactly data of required type should be extracted from incoming data body
     */
    constructor(public readonly type:ValueType,
                public readonly dataFeed:DataFeed,
                private readonly parser:(data:any) => number) {

        dataFeed.addDataUpdateListener(() => this.dataUpdateHandler());
        dataFeed.addDataErrorListener(() => this.dataErrorHandler());
    }

    //---------------------------------
    // Public properties
    //---------------------------------

    /**
     * Last known valid value of required value entry
     */
    get value():number {
        return this._value;
    }

    /**
     * Flag which indicates if there is a reason to assume that value is outdated.
     */
    get isOutDated():boolean {
        if (!this._value) { //Value is not set therefor it cannot be outdated
            return false;
        }
        //Criteria for outdated values is taken to be any value that haven't got its update
        //for three update intervals of data source.
        return this.dataFeed.dataTime + this.dataFeed.updateInterval * 3 < Date.now();
    }

    //---------------------------------
    // Public methods
    //---------------------------------

    /**
     * Add value update listener.
     * @param listener Listener that shall be invoked as parsed value is updated.
     */
    addUpdateListener(listener:UpdateListener):void {
        if(this.updateListeners.indexOf(listener) !== -1) {
            throw "Listener is already assigned";
        }
        this.updateListeners.push(listener);
    }

    //---------------------------------
    // Private methods
    //---------------------------------

    /**
     * Handle data source updates
     */
    private dataUpdateHandler():void {
        let newValue:number = this.parser(this.dataFeed.data);
        if (!newValue) {
            console.log(`Data cannot be parsed into meaningful value - most likely incoming data (${this.dataFeed.data}) are corrupt.`);
        } else {
            const valueChanged:boolean = (this._value !== newValue);
            this._value = newValue;
            if (valueChanged) {
                //Notify on data update only in case if value have actually changed thus save some 
                //screen rendering resources or spamming console with data that hasn't changed.
                this.dispatchUpdateEvent();
            }
        }
    }

    /**
     * Handle data source errors
     */
    private dataErrorHandler():void {
        if (this.isOutDated) { 
            //Value display might require an update as we're with data error and outdated value
            this.dispatchUpdateEvent();
        }
    }

    /**
     * Notify all interested parties that we have got a value update
     */
    private dispatchUpdateEvent():void {
        this.updateListeners.forEach(listener => listener(this));
    }

}

export type UpdateListener = {
    (data?:ValueProvider):void
}