import {AxiosResponse} from "axios";
import * as https from "https";
import {FileInfo, RowData, SheetData, SwaggerData} from "./model/app-model";
import listService from './data/service.json';

const fs = require('fs');
const xlsx = require('xlsx');
const axiosRq = require('axios');
const axios = axiosRq.create({ // by pass ssl err
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});

// const fileNameRegex = new RegExp('^API-SUMMARY-[0-9]{2}_[0-9]{2}_[0-9]{4}\.xlsx$', 'gi');
const fileNameRegex = /^API-SUMMARY-[0-9]{2}_[0-9]{2}_[0-9]{4}.xlsx$/g;

const dirname = '/home/binhdv/code/data';

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
    return result;
}

function getSwaggerDataToExcel(outPath: string) {
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
                data: sortRowData(extractRowDataFromPaths(response.data.paths))
            };
            result.push(sheetData);
        }
        writeDataToExcel(result, outPath);
        console.log('--- Export swagger to excel done! ---');
    }));
}

function sortRowData(rowDatas: RowData[]): RowData[] {
    return rowDatas.sort((a, b) => {
        if (a.url === undefined || b.url === undefined) {
            return 1;
        }
        return a.url > b.url ? 1 : -1;
    });
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
                summary: x.summary ? x.summary : '',
                description: x.description ? x.description : ''
            };
            result.push(output);
        }
    }
    return result;
}

function writeDataToExcel(listSheetData: SheetData[], outPath: string) {
    let workBook = xlsx.utils.book_new();
    for (const sheet of listSheetData) {
        const workSheet = xlsx.utils.json_to_sheet(sheet.data);
        const col1MaxWitdh = sheet.data?.reduce((w, r) => Math.max(w, r.controller ? r.controller.length : 0), 10);
        const col2MaxWitdh = sheet.data?.reduce((w, r) => Math.max(w, r.method ? r.method.length : 0), 10);
        const col3MaxWitdh = sheet.data?.reduce((w, r) => Math.max(w, r.url ? r.url.length : 0), 10);
        const col4MaxWitdh = sheet.data?.reduce((w, r) => Math.max(w, r.summary ? r.summary.length : 0), 10);
        const col5MaxWitdh = sheet.data?.reduce((w, r) => Math.max(w, r.description ? r.description.length : 0), 10);
        workSheet['!cols']= [
            {wch: col1MaxWitdh},
            {wch: col2MaxWitdh},
            {wch: col3MaxWitdh},
            {wch: col4MaxWitdh},
            {wch: col5MaxWitdh}
        ];
        xlsx.utils.book_append_sheet(workBook, workSheet, sheet.name);
    }
    xlsx.writeFile(workBook, outPath);
    console.log('--- Write data to excel done! ---');
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

// find all files in folder that match regex
function findLatestFilePath(dirname: string): string | null {
    const matchFiles: FileInfo[] = findMatchFilesName(dirname);
    if (matchFiles.length === 0) {
        return null;
    }
    let latest = matchFiles[0];
    for (const f of matchFiles) {
        if (f.time > latest.time) {
            latest = f;
        }
    }
    return `${dirname}/${latest.name}`;
}

function findMatchFilesName(dirname: string): FileInfo[] {
    const result: FileInfo[] = [];
    let filenames: string[] = [];
    filenames = fs.readdirSync(dirname);
    filenames = filenames.filter(x => fileNameRegex.test(x));
    for (const f of filenames) {
        const dmyStr = f.substring(12, 22);
        const d = dmyStr.substring(0, 2);
        const m = dmyStr.substring(3, 5);
        const y = dmyStr.substring(6, 10);
        const date = new Date(Number(y), Number(m) - 1, Number(d));
        const fileInfo: FileInfo = {
            name: f,
            time: date.getTime()
        };
        result.push(fileInfo);
    }
    return result;
}

function genFilePath(dirname: string, day: string, month: string, year: string): string {
    return `${dirname}/API-SUMMARY-${day}_${month}_${year}.xlsx`;
}

function numberToStringTwoDigits(x: number): string {
    if (x < 10) {
        return '0' + x;
    }
    return x + '';
}

function finalAction() {
    console.log('--- Working on it ---');
    /*
        - get latest file
        - null
           + true: read swagger => to excel
           + false: read excel to object, read swagger to object, merge, to excel
     */
    const date = new Date();
    const day = numberToStringTwoDigits(date.getDate());
    const month = numberToStringTwoDigits(date.getMonth() + 1);
    const year = numberToStringTwoDigits(date.getFullYear());
    const outputFilePath = genFilePath(dirname, day, month, year);

    const latestFilePath = findLatestFilePath(dirname);
    if (latestFilePath === null) {
        getSwaggerDataToExcel(outputFilePath);
    } else {
        const latestFileSheetData: SheetData[] = readExcelData(latestFilePath);
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
                    data: sortRowData(extractRowDataFromPaths(response.data.paths))
                };
                newSheetData.push(sheetData);
            }
            const final: Array<SheetData> = mergeExcelData(latestFileSheetData, newSheetData);
            writeDataToExcel(final, outputFilePath);
        }));
    }
}

finalAction();