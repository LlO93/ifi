import {handleMarket} from '../_market-handler.mjs';

export function GET(request){return handleMarket(request,'daily');}
