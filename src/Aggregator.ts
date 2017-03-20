import {ValueProvider} from "./ValueProvider";
import {ValueType} from "./ValueType";
/**
 * Feed values aggregator class.
 * @author Jānis Radiņš
 */
export class Aggregator {

    private updateTimeout:any = null;

    constructor(private readonly valueProviders:ValueProvider[]) {
        //Subscribe to all value provider update notifications already on startup
        //This implies that value providers are immutable list and that is fine
        this.valueProviders.forEach((provider:ValueProvider) => {
            provider.addUpdateListener(() => this.valueUpdateHandler());
        });
    }

    /**
     * Start data aggregation.
     */
    start():void {
        this.valueProviders.forEach(provider => {
            //Some value providers can share data feed so we better make sure if 
            //particular data feed is already started
            if (!provider.dataFeed.running) {
                provider.dataFeed.start();
            }
        });
    }

    /**
     * Stop data aggregation.
     */
    stop():void {
        this.valueProviders.forEach((provider:ValueProvider) => {
            if (provider.dataFeed.running) {
                provider.dataFeed.stop();
            }
        })
    }

    /**
     * Handle value providers updated values
     */
    private valueUpdateHandler():void {
        //Update is already schedualed so we have nothing to do here
        if (this.updateTimeout) {
            return;
        }

        //We have to update output within some timout so in case if there are several
        //value providers that listen to same data we dont run aggregation per each value 
        //updated within same iteration
        this.updateTimeout = setTimeout(() => {
            this.updateTimeout = null;
            this.updateDisplay();
        }, 100);
    }

    /**
     * Aggregate data and show output to consoele.
     */
    private updateDisplay():void {
        let aggregateValues:Map<ValueType, EntryData> = this.aggregateValues();

        let valueOutput:string[] = [];
        let srcOutput:string[] = [];

        aggregateValues.forEach((data:EntryData, valueType:ValueType) => {
            const typeName:string = this.typeToString(valueType);
            valueOutput.push(`${typeName}: ${data.outputValue}`);
            srcOutput.push(`${typeName} (${data.valid} of ${data.total})`);            
        });

        console.log(`${valueOutput.join("\t")} Active sources: ${srcOutput.join("\t")}`)
    }

    /**
     * Prepeare aggregated values
     */
    private aggregateValues():Map<ValueType, EntryData>  {
        const data:Map<ValueType, EntryData> = new Map<ValueType, EntryData>();
        this.valueProviders.forEach((provider:ValueProvider) => {
            let entryData:EntryData;
            if (!data.has(provider.type)) {
                entryData = {total:0, valid:0, outputValue:0};
                data.set(provider.type, entryData);
            } else {
                entryData = data.get(provider.type);
            }           
            entryData.total++;
            if (provider.value) {
                if (!provider.isOutDated) {
                    entryData.valid++;
                }
                if (provider.value > entryData.outputValue) {
                    entryData.outputValue = provider.value;
                }
            }

        });
        return data;
    }

    /**
     * Convert value type to string representation.
     * @param type Value type entry.
     */
    private typeToString(type:ValueType):string {
        switch(type) {
            case ValueType.BTC_EUR :   return "BTC/EUR";
            case ValueType.BTC_USD :   return "BTC/USD";
            case ValueType.EUR_USD :   return "EUR/USD";
        }
        throw "unknown data type";
    }
    
}

type EntryData = {
    total:number,
    valid:number,
    outputValue:number
}