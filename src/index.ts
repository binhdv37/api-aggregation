import {AxiosResponse} from "axios";
import * as https from "https";
import {RowData, SheetData, SwaggerData} from "./model/app-model";
import listService from './data/service.json';

const xlsx = require('xlsx');
const axiosRq = require('axios');
const axios = axiosRq.create({ // by pass ssl err
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

const outputFilePath = '/home/binhdv/Desktop/out.xlsx';
const inputFilePath = '/home/binhdv/Desktop/in.xlsx';

function readExcelData() {
    const result: SheetData[] = [];
    const file = xlsx.readFile(inputFilePath);
    const sheets = file.sheetNames;
    for(let i = 0; i < sheets.length; i++) {
        const rowsData: RowData[] = [];
        const temp = xlsx.utils.sheet_to_json(file.Sheets[sheets[i]]);
        temp.forEach((res: RowData) => {
            rowsData.push(res)
        });
        result.push({name: sheets[i], data: rowsData});
    }
    console.log('--------------');
    console.log(result);
}

function getSwaggerDataToExcel() {
    let result: SheetData[] = [];
    const listReq = [];
    for (const service of listService) {
        const req = axios?.get(service.url);
        listReq.push(req);
    }
    axiosRq.all(listReq).then(axiosRq.spread((...resp: AxiosResponse<SwaggerData>[]) => {
        for (let i = 0; i < listService.length; i++) {
            const response = resp[i];
            const sheetData = {
                name: listService[i].name,
                data: extractDataFromPaths(response.data.paths, listService[i].name)
            };
            result.push(sheetData);
        }
        console.log('--- DONE ---');
        console.log(JSON.stringify(result));
        writeDataToExcel(result);
    }));
}

function extractDataFromPaths(paths: any, serviceName: string): Array<RowData> {
    const result = [];
    for (const url in paths) {
        const methodData = paths[url];
        for (const method in methodData) {
            const x = methodData[method];
            const output: RowData = {
                service: serviceName,
                controller: x.tags.length > 0 ? x.tags[0] : '',
                method: method,
                url: url,
                summary: x.summary,
                description: x.description
            };
            result.push(output);
        }
    }
    return result;
}

function writeDataToExcel(listSheetData: SheetData[]) {
    let workBook = xlsx.utils.book_new();
    for (const sheet of listSheetData) {
        const workSheet = xlsx.utils.json_to_sheet(sheet.data);
        xlsx.utils.book_append_sheet(workBook, workSheet, sheet.name);
    }
    xlsx.writeFile(workBook, outputFilePath);
}


// getSwaggerDataToExcel();
readExcelData();
