declare var console: {
    log: (...data: any[]) => void;
    info: (...data: any[]) => void;
    warn: (...data: any[]) => void;
    error: (...data: any[]) => void;
};

declare class InternalError extends Error {}
declare var __date_clock: () => number;

interface Function {
    fileName?: string;
    lineNumber?: number;
}
