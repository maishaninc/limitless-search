declare module "sql.js/dist/sql-asm.js" {
  export class Statement {
    bind(values?: unknown[] | Record<string, unknown>): boolean;
    step(): boolean;
    getAsObject(params?: unknown[] | Record<string, unknown>): Record<string, unknown>;
    run(values?: unknown[] | Record<string, unknown>): void;
    free(): boolean;
  }

  export class Database {
    constructor(data?: ArrayLike<number> | Uint8Array);
    run(sql: string, params?: unknown[] | Record<string, unknown>): Database;
    exec(
      sql: string,
      params?: unknown[] | Record<string, unknown>,
    ): Array<{ columns: string[]; values: unknown[][] }>;
    prepare(sql: string, params?: unknown[] | Record<string, unknown>): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export type SqlJsStatic = {
    Database: typeof Database;
  };

  export default function initSqlJs(config?: Record<string, unknown>): Promise<SqlJsStatic>;
}
