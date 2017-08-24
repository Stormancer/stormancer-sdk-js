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

namespace Stormancer {

    /**
    Available log levels
    @alias LogLevel
    @enum {number}
    @memberof Stormancer
    */
    var _ = // Fake object for jsdoc enum LogLevel
        {
            /** 0 - Fatal error. The application crashed. */
            fatal: 0,
            /** 1 - Error. The application may crash. */
            error: 1,
            /** 2 - Warning. Something went wrong but dealt. */
            warn: 2,
            /** 3 - Information. Significant information. */
            info: 3,
            /** 4 - Debug. Can be useful for debugging. */
            debug: 4,
            /** 5 - Trace. Only for deep debug. */
            trace: 5
        };

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
}
