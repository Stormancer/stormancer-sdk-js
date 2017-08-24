/**
Contract for a Logger in Stormancer.
@interface ILogger
@memberof Stormancer
*/
/**
Logs a json message.
@method Stormancer.ILogger#log
@param {Stormancer.LogLevel} level Log level.
@param {string} category Log category. Typically where the log was generated.
@param {string} message Log message. Description of the lof.
@param {object} data Detailed informations about the log.
*/

/**
Available log levels
@alias LogLevel
@enum {number}
@memberof Stormancer
*/

export enum LogLevel {
    fatal = 0,
    error = 1,
    warn = 2,
    info = 3,
    debug = 4,
    trace = 5
}

export interface ILogger {

    log(level: LogLevel, category: string, message: string, data: any);
}
