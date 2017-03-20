import {DataFeed} from "./DataFeed";
import {ValueProvider} from "./ValueProvider";
import {ValueType} from "./ValueType";
import {Aggregator} from "./Aggregator";

const btcEDataSource:DataFeed = new DataFeed(`https://btc-e.com/api/3/ticker/btc_usd-btc_eur-eur_usd`, 10000);
const valueProviders:ValueProvider[] = [
    //Value parsers of btc-e.com which will take 3 values from single feed
    new ValueProvider(ValueType.BTC_USD, btcEDataSource, data => data.btc_usd.last),
    new ValueProvider(ValueType.BTC_EUR, btcEDataSource, data => data.btc_eur.last),
    new ValueProvider(ValueType.EUR_USD, btcEDataSource, data => data.eur_usd.last),
    //bitstamp.net value parsers ... each of whom has got a seperate request URI
    new ValueProvider(ValueType.BTC_USD, new DataFeed(`https://www.bitstamp.net/api/v2/ticker/btcusd`, 20000), data => data.last),
    new ValueProvider(ValueType.BTC_EUR, new DataFeed(`https://www.bitstamp.net/api/v2/ticker/btceur`, 30000), data => data.last),
    new ValueProvider(ValueType.EUR_USD, new DataFeed(`https://www.bitstamp.net/api/v2/ticker/eurusd`, 40000), data => data.last),
    //bitcoincharts.com value just for a BTC_USD (will be updated once in 15 minutes)
    new ValueProvider(ValueType.BTC_USD, new DataFeed(`http://api.bitcoincharts.com/v1/markets.json`, 900000), 
        (data:any):number => (data as {symbol:string, avg:number}[]).filter(entry => entry.symbol === "localbtcUSD")[0].avg
    )    
];

const aggregator:Aggregator = new Aggregator(valueProviders);
aggregator.start();