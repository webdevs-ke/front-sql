import * as i0 from '@angular/core';

type DataType = 'INT' | 'TEXT' | 'BLOB';
interface Column {
    name: string;
    type: DataType;
    primary?: boolean;
    unique?: boolean;
    autoIncrement?: boolean;
}

type Expr = BinaryExpr | UnaryExpr | LiteralExpr | IdentifierExpr | GroupExpr | InExpr | BetweenExpr | AggregateExpr | IsNullExpr;
interface BinaryExpr {
    kind: 'BINARY';
    left: Expr;
    operator: string;
    right: Expr;
}
interface UnaryExpr {
    kind: 'UNARY';
    operator: string;
    right: Expr;
}
interface LiteralExpr {
    kind: 'LITERAL';
    value: any;
}
interface IdentifierExpr {
    kind: 'IDENTIFIER';
    name: string;
}
interface GroupExpr {
    kind: 'GROUP';
    expression: Expr;
}
interface InExpr {
    kind: 'IN';
    left: Expr;
    values: Expr[];
}
interface BetweenExpr {
    kind: 'BETWEEN';
    value: Expr;
    lower: Expr;
    upper: Expr;
}
interface AggregateExpr {
    kind: 'AGGREGATE';
    func: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
    argument: string | '*';
}
interface IsNullExpr {
    kind: 'IS_NULL';
    expression: Expr;
    not: boolean;
}

type AggregateColumn = {
    type: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
    argument: string | '*';
    alias?: string;
};
type SelectColumn = {
    type: 'COLUMN';
    name: string;
    alias?: string;
} | AggregateColumn;
type AlterAction = {
    type: 'ADD_COLUMN';
    column: Column;
} | {
    type: 'DROP_COLUMN';
    column: string;
} | {
    type: 'RENAME_COLUMN';
    from: string;
    to: string;
} | {
    type: 'RENAME_TABLE';
    to: string;
};
interface FromClause {
    table: string;
    alias?: string;
}
interface JoinClause {
    type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
    table: string;
    alias?: string;
    on: Expr;
}

declare class Table {
    name: string;
    columns: Column[];
    rows: any[];
    indexes: Map<string, Map<any, any>>;
    autoIncrementCounters: Record<string, number>;
    constructor(name: string, columns: Column[], rows: any[]);
    insert(row: any): void;
    applyAlter(action: AlterAction): void;
}

interface FrontFile {
    name: string;
    type: string;
    size: number;
    data: Uint8Array;
    id: string;
    tableRef: string;
    column: string;
    foreignKeyValue: string | number;
}

declare class IndexedDbService {
    private db;
    private opened;
    open(): Promise<void>;
    saveTable(name: string, data: any): Promise<void>;
    loadTable(name: string): Promise<any>;
    deleteTable(name: string): Promise<void>;
    tableExists(name: string): Promise<boolean>;
    iterateKeys(cb: (key: IDBValidKey) => void): Promise<void>;
    deleteByPrefix(prefix: string): Promise<void>;
    saveFile(file: any): Promise<void>;
    deleteFile(id: string): Promise<void>;
    loadFile(id: string): Promise<any>;
    loadFilesByTable(tableRef: string): Promise<any>;
    static ɵfac: i0.ɵɵFactoryDeclaration<IndexedDbService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<IndexedDbService>;
}

declare class DatabaseService {
    private store;
    private currentDB;
    private databases;
    tables: Map<string, Table>;
    constructor(store: IndexedDbService);
    private init;
    useDatabase(name: string): Promise<void>;
    private persistDatabases;
    createDatabase(name: string): Promise<void>;
    listDatabases(): Promise<string[]>;
    saveFile(file: File, tableName: string, columnName: string, foreignKeyValue: string): Promise<FrontFile>;
    deleteFile(tableName: string, columnName: string, foreignKeyValue: string): Promise<boolean>;
    loadFile(tableName: string, columnName: string, foreignKeyValue: string): Promise<FrontFile>;
    loadFilesByTable(tableName: string): Promise<FrontFile[]>;
    listTables(): Promise<string[]>;
    dropDatabase(name: string): Promise<void>;
    createTable(name: string, columns: Column[]): Promise<void>;
    dropTable(tableName: string): Promise<void>;
    renameTable(oldName: string, newName: string): Promise<Table>;
    private resolveColumn;
    private processSelectRows;
    select(from: FromClause, joins?: JoinClause[], where?: any, columns?: SelectColumn[], distinct?: boolean, orderBy?: {
        column: string;
        direction: 'ASC' | 'DESC';
    }[], limit?: number, offset?: number, groupBy?: string[], having?: any): Promise<any[]>;
    private applyJoin;
    private buildNullRow;
    private buildNullFromExisting;
    private prefixRow;
    private computeAggregate;
    insert(tableName: string, row: any): Promise<Table>;
    private validateRow;
    private coerceType;
    persist(name: string): Promise<void>;
    table(name: string): Promise<Table>;
    loadTable(name: string): Promise<Table>;
    static ɵfac: i0.ɵɵFactoryDeclaration<DatabaseService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<DatabaseService>;
}

declare class SqlEngineService {
    private db;
    constructor(db: DatabaseService);
    execute(sql: string): Promise<any>;
    private executeAst;
    static ɵfac: i0.ɵɵFactoryDeclaration<SqlEngineService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<SqlEngineService>;
}

declare class FrontSql {
    static ɵfac: i0.ɵɵFactoryDeclaration<FrontSql, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<FrontSql, "lib-front-sql", never, {}, {}, never, never, true, never>;
}

export { DatabaseService, FrontSql, IndexedDbService, SqlEngineService };
