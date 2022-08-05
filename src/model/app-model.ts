export interface SwaggerData {
    swagger?: string;
    info?: any;
    host?: string;
    tags?: Array<ControllerInfo>;
    paths?: any;
}

export interface ControllerInfo {
    name?: string;
    description?: string;
}

export interface RowData {
    controller?: string;
    method?: string;
    url?: string;
    summary?: string;
    description?: string;
}

export interface SheetData {
    name?: string; // sheet name - service name
    data?: Array<RowData>;
}