import {AxiosResponse} from "axios";
import * as https from "https";

const axiosRq = require('axios');
const axios = axiosRq.create({ // by pass ssl err
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

const apiEndpoint = 'https://kong-dev.apps.ocp-eco02.dev.sunteco.local/sun-monitor/api/v2/api-docs';

axios
    .get(apiEndpoint)
    .then((res: AxiosResponse<any>) => {
        console.log('--- SUCCESS ---');
        console.log(res.data);
    })
    .catch((error: any) => {
        console.log('--- ERROR ---')
        console.error(error);
    });
