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
const finalFilePath = '/home/binhdv/Desktop/final.xlsx';

function readExcelData(filePath: string): Array<SheetData> {
    const result: SheetData[] = [];
    const file = xlsx.readFile(filePath);
    const sheets = file.SheetNames;
    for(let i = 0; i < sheets.length; i++) {
        const rowsData: RowData[] = [];
        const temp = xlsx.utils.sheet_to_json(file.Sheets[sheets[i]]);
        temp.forEach((res: RowData) => {
            rowsData.push(res)
        });
        result.push({name: sheets[i], data: rowsData});
    }
    // console.log('--------------');
    // console.log(result);
    return result;
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
                data: extractRowDataFromPaths(response.data.paths)
            };
            result.push(sheetData);
        }
        console.log('--- DONE ---');
        console.log(JSON.stringify(result));
        writeDataToExcel(result);
    }));
}

function extractRowDataFromPaths(paths: any): Array<RowData> {
    const result = [];
    for (const url in paths) {
        const methodData = paths[url];
        for (const method in methodData) {
            const x = methodData[method];
            const output: RowData = {
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

function mergeExcelData(oldData: Array<SheetData>, newData: Array<SheetData>): Array<SheetData> {
    let result: Array<SheetData> = [];
    // 1 sheetData = 1 service
    for (const sheetData of newData) {
        const sameOldSheetData = oldData.find(x => x.name === sheetData.name);
        if (sameOldSheetData === null || sameOldSheetData === undefined) {
            // new service
            result.push(sheetData);
            continue;
        }
        // merge two sheet data
        const mergedSheetData: SheetData = {
            name: sheetData.name,
            data: mergeSheetData(sameOldSheetData.data as any, sheetData.data as any)
        };
        result.push(mergedSheetData);
    }
    return result;
}

function mergeSheetData(oldData: Array<RowData>, newData: Array<RowData>): Array<RowData> {
    let result: Array<RowData> = [];
    for (const newRow of newData) {
        const sameOldRow = oldData.find(x => x.url === newRow.url && x.method === newRow.method);
        if (sameOldRow !== null && sameOldRow !== undefined) {
            result.push(sameOldRow);
            continue;
        }
        result.push(newRow);
    }
    return result;
}

function finalAction() {
    /*
        - read from api => newSheetData
        - read from excel => oldSheetData
        - merge => write to excel
     */
    const oldSheetData: SheetData[] = readExcelData(inputFilePath);

    let newSheetData: SheetData[] = [];
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
                data: extractRowDataFromPaths(response.data.paths)
            };
            newSheetData.push(sheetData);
        }
        const final: Array<SheetData> = mergeExcelData(oldSheetData, newSheetData);
        console.log('----------final------------');
        console.log(JSON.stringify(final));
    }));
}

// getSwaggerDataToExcel();
// readExcelData();
finalAction();