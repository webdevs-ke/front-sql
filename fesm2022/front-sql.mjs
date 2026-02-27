import * as i0 from '@angular/core';
import { Injectable, Input, Component, HostListener, ViewChild } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import * as i2 from '@angular/forms';
import { FormControl, Validators, ReactiveFormsModule } from '@angular/forms';

var TokenType;
(function (TokenType) {
    TokenType["KEYWORD"] = "KEYWORD";
    TokenType["IDENTIFIER"] = "IDENTIFIER";
    TokenType["NUMBER"] = "NUMBER";
    TokenType["STRING"] = "STRING";
    TokenType["OPERATOR"] = "OPERATOR";
    TokenType["NULL"] = "NULL";
    TokenType["COMMA"] = "COMMA";
    TokenType["DOT"] = "DOT";
    TokenType["STAR"] = "STAR";
    TokenType["LPAREN"] = "LPAREN";
    TokenType["RPAREN"] = "RPAREN";
    TokenType["EOF"] = "EOF";
})(TokenType || (TokenType = {}));

const SQL_KEYWORDS = new Set([
    'SELECT',
    'INSERT',
    'UPDATE',
    'DELETE',
    'CREATE',
    'DROP',
    'ALTER',
    'ADD',
    'COLUMN',
    'PRIMARY',
    'UNIQUE',
    'RENAME',
    'TO',
    'DATABASE',
    'DATABASES',
    'TABLE',
    'TABLES',
    'FROM',
    'WHERE',
    'INTO',
    'VALUES',
    'SET',
    'USE',
    'SHOW',
    'DESCRIBE',
    'IS',
    'NOT',
    'NULL',
    'DISTINCT',
    'LIKE',
    'ORDER',
    'BY',
    'ASC',
    'DESC',
    'LIMIT',
    'OFFSET',
    'IN',
    'BETWEEN',
    'GROUP',
    'COUNT',
    'SUM',
    'AVG',
    'MIN',
    'MAX',
    'HAVING',
    'AS',
    'INNER',
    'LEFT',
    'RIGHT',
    'FULL',
    'OUTER',
    'CROSS',
    'JOIN',
    'ON',
    'AUTO_INCREMENT'
]);

class SqlLexer {
    input;
    pos = 0;
    constructor(input) {
        this.input = input;
    }
    tokenize() {
        const tokens = [];
        while (true) {
            const token = this.nextToken();
            tokens.push(token);
            if (token.type === TokenType.EOF)
                break;
        }
        return tokens;
    }
    nextToken() {
        this.skipWhitespace();
        const start = this.pos;
        if (this.pos >= this.input.length)
            return this.makeToken(TokenType.EOF, '', start);
        const ch = this.input[this.pos];
        // single-line comment
        if (ch === '-' && this.peek() === '-') {
            this.skipSingleLineComment();
            return this.nextToken();
        }
        // multi-line comment
        if (ch === '/' && this.peek() === '*') {
            this.skipMultiLineComment();
            return this.nextToken();
        }
        if (this.isLetter(ch))
            return this.readIdentifierOrKeyword();
        if (this.isDigit(ch))
            return this.readNumber();
        if (ch === `'`)
            return this.readString();
        // comparison operators
        if (ch === '=')
            return this.readOperator();
        if (ch === '!' && this.peek() === '=')
            return this.readOperator();
        if (ch === '<' || ch === '>')
            return this.readOperator();
        switch (ch) {
            case ',':
                this.pos++;
                return this.makeToken(TokenType.COMMA, ',', start);
            case '*':
                this.pos++;
                return this.makeToken(TokenType.STAR, '*', start);
            case '(':
                this.pos++;
                return this.makeToken(TokenType.LPAREN, '(', start);
            case ')':
                this.pos++;
                return this.makeToken(TokenType.RPAREN, ')', start);
            case '.':
                this.pos++;
                return this.makeToken(TokenType.DOT, '.', start);
        }
        throw new Error(`Unexpected character '${ch}' at position ${this.pos}`);
    }
    skipWhitespace() {
        while (this.pos < this.input.length && /\s/.test(this.input[this.pos]))
            this.pos++;
    }
    isLetter(ch) {
        return /[a-z_]/i.test(ch);
    }
    isDigit(ch) {
        return /\d/.test(ch);
    }
    // inspect the next character
    peek(offset = 1) {
        return this.input[this.pos + offset] ?? '';
    }
    readOperator() {
        const start = this.pos;
        let value = this.input[this.pos];
        if ((value === '!' || value === '<' || value === '>') &&
            this.peek() === '=') {
            value += '=';
            this.pos += 2;
        }
        else {
            this.pos++;
        }
        return this.makeToken(TokenType.OPERATOR, value, start);
    }
    readIdentifierOrKeyword() {
        const start = this.pos;
        while (this.pos < this.input.length &&
            /[a-z0-9_]/i.test(this.input[this.pos])) {
            this.pos++;
        }
        const raw = this.input.slice(start, this.pos);
        const upper = raw.toUpperCase();
        // logical operators
        if (upper === 'AND' || upper === 'OR')
            return this.makeToken(TokenType.OPERATOR, upper, start);
        // NULL literal
        if (upper === 'NULL')
            return this.makeToken(TokenType.NULL, null, start);
        const type = SQL_KEYWORDS.has(upper) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
        return this.makeToken(type, upper, start);
    }
    readNumber() {
        const start = this.pos;
        let hasDot = false;
        while (this.pos < this.input.length) {
            const ch = this.input[this.pos];
            if (ch === '.') { // decimal numbers
                if (hasDot)
                    break;
                hasDot = true;
                this.pos++;
                continue;
            }
            if (!/\d/.test(ch))
                break;
            this.pos++;
        }
        const value = this.input.slice(start, this.pos);
        if (value === '.')
            throw new Error(`Invalid number at position ${start}`);
        return this.makeToken(TokenType.NUMBER, value, start);
    }
    readString() {
        const start = this.pos;
        this.pos++; // skip opening '
        let value = '';
        while (this.pos < this.input.length) {
            const ch = this.input[this.pos];
            // escaped single quote: ''
            if (ch === "'" && this.peek() === "'") {
                value += "'";
                this.pos += 2;
                continue;
            }
            // closing quote
            if (ch === "'") {
                this.pos++;
                return this.makeToken(TokenType.STRING, value, start);
            }
            value += ch;
            this.pos++;
        }
        throw new Error(`Unterminated string literal at ${start}`);
    }
    makeToken(type, value, start) {
        return {
            type,
            value,
            start,
            end: this.pos
        };
    }
    skipSingleLineComment() {
        this.pos += 2; // skip --
        while (this.pos < this.input.length &&
            this.input[this.pos] !== '\n') {
            this.pos++;
        }
    }
    skipMultiLineComment() {
        this.pos += 2; // skip /*
        while (this.pos < this.input.length) {
            if (this.input[this.pos] === '*' &&
                this.peek() === '/') {
                this.pos += 2; // skip */
                return;
            }
            this.pos++;
        }
        throw new Error('Unterminated multi-line comment');
    }
}

function normalize(value) {
    if (typeof value === 'string' && !isNaN(Number(value)))
        return Number(value);
    return value;
}
function truthy(value) {
    if (value === null)
        return false;
    return Boolean(value);
}

const PRECEDENCE = {
    OR: 1,
    AND: 2,
    '=': 3,
    '!=': 3,
    '<': 3,
    '<=': 3,
    '>': 3,
    '>=': 3,
    LIKE: 3,
    IN: 3,
    BETWEEN: 3,
    IS: 3,
    '+': 4,
    '-': 4,
    '*': 5,
    '/': 5
};
class ExprParser {
    tokens;
    pos = 0;
    constructor(tokens) {
        this.tokens = tokens;
    }
    parse() {
        return this.parseExpression(0);
    }
    parseExpression(minPrecedence) {
        let left = this.parseUnary();
        while (true) {
            const token = this.current();
            if (token.type !== TokenType.OPERATOR &&
                token.type !== TokenType.KEYWORD)
                break;
            // HANDLE comparison keywords BEFORE precedence check
            if (token.type === TokenType.KEYWORD &&
                ['NOT', 'IN', 'BETWEEN', 'IS'].includes(token.value)) {
                left = this.parseComparison(left);
                continue;
            }
            const precedence = PRECEDENCE[token.value];
            if (precedence === undefined || precedence < minPrecedence)
                break;
            this.advance();
            const right = this.parseExpression(precedence + 1);
            left = {
                kind: 'BINARY',
                left,
                operator: token.value,
                right
            };
        }
        return left;
    }
    parseComparison(left) {
        const token = this.current();
        // ---- HANDLE NOT prefixed comparisons ----
        if (token.type === TokenType.KEYWORD &&
            token.value === 'NOT') {
            const next = this.next();
            if (next?.value !== 'IN' && next?.value !== 'BETWEEN') {
                throw new Error(`Unexpected token '${next?.value}' after prefixed 'NOT'.`);
            }
            if (next?.value === 'IN' || next?.value === 'BETWEEN') {
                this.advance(); // consume NOT
                const op = this.advance().value; // consume IN or BETWEEN
                const comparison = this.buildComparison(op, left);
                return {
                    kind: 'UNARY',
                    operator: 'NOT',
                    right: comparison
                };
            }
        }
        // ---- HANDLE NORMAL COMPARISONS ----
        if (token.type === TokenType.OPERATOR ||
            token.type === TokenType.KEYWORD) {
            const op = token.value;
            if (!PRECEDENCE[op])
                return left;
            this.advance();
            // IS [NOT] NULL special case
            if (op === 'IS') {
                let not = false;
                if (this.current().value === 'NOT') {
                    not = true;
                    this.advance();
                }
                if (this.current().type !== TokenType.NULL)
                    throw new Error(`Expected NULL after infix '${not ? 'NOT' : 'IS'}'`);
                this.advance();
                return {
                    kind: 'IS_NULL',
                    expression: left,
                    not
                };
            }
            return this.buildComparison(op, left);
        }
        return left;
    }
    buildComparison(op, left) {
        if (op === 'IN') {
            this.expect(TokenType.LPAREN);
            const values = [];
            if (this.current().type !== TokenType.RPAREN) {
                do {
                    values.push(this.parseExpression(0));
                } while (this.match(TokenType.COMMA));
            }
            this.expect(TokenType.RPAREN);
            return {
                kind: 'IN',
                left,
                values
            };
        }
        if (op === 'BETWEEN') {
            const lower = this.parseExpression(PRECEDENCE['BETWEEN'] + 1);
            if (this.current().value !== 'AND')
                throw new Error("Expected AND in BETWEEN");
            this.advance();
            const upper = this.parseExpression(PRECEDENCE['BETWEEN'] + 1);
            return {
                kind: 'BETWEEN',
                value: left,
                lower,
                upper
            };
        }
        // Standard binary comparison (=, <, >, LIKE, etc.)
        const right = this.parseExpression(PRECEDENCE[op] + 1);
        return {
            kind: 'BINARY',
            left,
            operator: op,
            right
        };
    }
    next() {
        return this.tokens[this.pos + 1];
    }
    current() {
        return this.tokens[this.pos];
    }
    advance() {
        return this.tokens[this.pos++];
    }
    expect(type) {
        const token = this.current();
        if (token.type !== type) {
            throw new Error(`Expected "${type}", got "${token.type}"`);
        }
        return this.advance();
    }
    match(type) {
        if (this.current().type === type) {
            this.advance();
            return true;
        }
        return false;
    }
    parseUnary() {
        const token = this.current();
        if ((token.type === TokenType.OPERATOR && token.value === '-') ||
            (token.type === TokenType.KEYWORD && token.value.toUpperCase() === 'NOT')) {
            this.advance();
            return {
                kind: 'UNARY',
                operator: token.value,
                right: this.parseExpression(3) //  Parse everything at comparison level and above as part of the NOT.
            };
        }
        return this.parsePrimary();
    }
    parsePrimary() {
        const token = this.current();
        // AGGREGATE FUNCTIONS
        if (token.type === TokenType.KEYWORD &&
            ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']
                .includes(token.value.toUpperCase())) {
            const func = this.advance().value.toUpperCase();
            this.expect(TokenType.LPAREN);
            let argument;
            if (this.current().type === TokenType.STAR) {
                this.advance();
                argument = '*';
            }
            else {
                argument = this.expect(TokenType.IDENTIFIER).value;
            }
            this.expect(TokenType.RPAREN);
            return {
                kind: 'AGGREGATE',
                func,
                argument
            };
        }
        // normal primary handling continues
        this.advance();
        switch (token.type) {
            case TokenType.NUMBER:
            case TokenType.STRING:
                return {
                    kind: 'LITERAL',
                    value: normalize(token.value)
                };
            case TokenType.NULL:
                return {
                    kind: 'LITERAL',
                    value: null
                };
            case TokenType.IDENTIFIER: {
                let name = token.value;
                while (this.current().type === TokenType.DOT) {
                    this.advance();
                    const next = this.expect(TokenType.IDENTIFIER);
                    name += '.' + next.value;
                }
                return {
                    kind: 'IDENTIFIER',
                    name
                };
            }
            case TokenType.LPAREN: {
                const expr = this.parseExpression(0);
                this.expect(TokenType.RPAREN);
                return {
                    kind: 'GROUP',
                    expression: expr
                };
            }
            default:
                throw new Error(`Unexpected token: ${token.value}`);
        }
    }
}

class SqlParser {
    tokens;
    pos = 0;
    constructor(tokens) {
        this.tokens = tokens;
    }
    parse() {
        const token = this.current();
        if (token.type !== TokenType.KEYWORD)
            throw new Error(`Unexpected token: ${token.value}`);
        switch (token.value) {
            case 'SELECT':
                return this.parseSelect();
            case 'INSERT':
                return this.parseInsert();
            case 'UPDATE':
                return this.parseUpdate();
            case 'DELETE':
                return this.parseDelete();
            case 'CREATE':
                return this.parseCreate();
            case 'DESCRIBE':
                return this.parseDescribe();
            case 'USE':
                return this.parseUse();
            case 'DROP':
                return this.parseDrop();
            case 'SHOW':
                return this.parseShow();
            case 'ALTER':
                return this.parseAlter();
            default:
                throw new Error(`Unsupported statement: ${token.value}`);
        }
    }
    parseCreate() {
        this.expectKeyword('CREATE');
        if (this.match(TokenType.KEYWORD, 'DATABASE')) {
            const name = this.expectIdentifier();
            const stmt = {
                kind: 'CREATE_DATABASE',
                name
            };
            return stmt;
        }
        if (this.match(TokenType.KEYWORD, 'TABLE'))
            return this.parseCreateTable();
        throw new Error('Unsupported CREATE statement');
    }
    parseCreateTable() {
        const table = this.expectIdentifier();
        this.expect(TokenType.LPAREN);
        const columns = [];
        do {
            const name = this.expectIdentifier();
            const datatype = this.expectIdentifier();
            let primary = false;
            let unique = false;
            let autoIncrement = false;
            if (this.match(TokenType.KEYWORD, 'PRIMARY')) {
                // this.expectKeyword('KEY')
                primary = true;
            }
            if (this.match(TokenType.KEYWORD, 'UNIQUE')) {
                unique = true;
            }
            if (this.match(TokenType.KEYWORD, 'AUTO_INCREMENT')) {
                autoIncrement = true;
            }
            columns.push({
                name,
                datatype,
                primary,
                unique,
                autoIncrement
            });
        } while (this.match(TokenType.COMMA));
        this.expect(TokenType.RPAREN);
        return {
            kind: 'CREATE_TABLE',
            table,
            columns
        };
    }
    parseAlter() {
        this.expectKeyword('ALTER');
        this.expectKeyword('TABLE');
        const table = this.expectIdentifier();
        const actions = [];
        do {
            if (this.match(TokenType.KEYWORD, 'ADD')) {
                this.expectKeyword('COLUMN');
                const name = this.expectIdentifier();
                const datatype = this.expectIdentifier();
                let primary = false;
                let unique = false;
                if (this.match(TokenType.KEYWORD, 'PRIMARY')) {
                    // this.expectKeyword('KEY')
                    primary = true;
                }
                if (this.match(TokenType.KEYWORD, 'UNIQUE')) {
                    unique = true;
                }
                actions.push({
                    type: 'ADD_COLUMN',
                    column: {
                        name,
                        type: datatype,
                        primary,
                        unique
                    }
                });
            }
            else if (this.match(TokenType.KEYWORD, 'DROP')) {
                this.expectKeyword('COLUMN');
                const column = this.expectIdentifier();
                actions.push({
                    type: 'DROP_COLUMN',
                    column
                });
            }
            else if (this.match(TokenType.KEYWORD, 'RENAME')) {
                if (this.match(TokenType.KEYWORD, 'COLUMN')) {
                    const from = this.expectIdentifier();
                    this.expectKeyword('TO');
                    const to = this.expectIdentifier();
                    actions.push({
                        type: 'RENAME_COLUMN',
                        from,
                        to
                    });
                }
                else if (this.match(TokenType.KEYWORD, 'TO')) {
                    const to = this.expectIdentifier();
                    actions.push({
                        type: 'RENAME_TABLE',
                        to
                    });
                }
                else
                    throw new Error('Invalid RENAME syntax');
            }
            else
                throw new Error('Unsupported ALTER TABLE action');
        } while (this.match(TokenType.COMMA));
        return {
            kind: 'ALTER_TABLE',
            table,
            actions
        };
    }
    parseUse() {
        this.expectKeyword('USE');
        const name = this.expectIdentifier();
        return {
            kind: 'USE_DATABASE',
            name
        };
    }
    parseDrop() {
        this.expectKeyword('DROP');
        if (this.match(TokenType.KEYWORD, 'DATABASE')) {
            const name = this.expectIdentifier();
            const stmt = {
                kind: 'DROP_DATABASE',
                name
            };
            return stmt;
        }
        if (this.match(TokenType.KEYWORD, 'TABLE')) {
            const table = this.expectIdentifier();
            const stmt = {
                kind: 'DROP_TABLE',
                table
            };
            return stmt;
        }
        throw new Error('Unsupported DROP statement');
    }
    parseShow() {
        this.expectKeyword('SHOW');
        if (this.match(TokenType.KEYWORD, 'DATABASES')) {
            return {
                kind: 'SHOW_DATABASES'
            };
        }
        if (this.match(TokenType.KEYWORD, 'TABLES')) {
            return {
                kind: 'SHOW_TABLES'
            };
        }
        throw new Error('Unsupported SHOW statement');
    }
    parseDescribe() {
        this.expectKeyword('DESCRIBE');
        if (this.match(TokenType.KEYWORD, 'TABLE')) {
            const table = this.expectIdentifier();
            const stmt = {
                kind: 'DESCRIBE_TABLE',
                table
            };
            return stmt;
        }
        throw new Error('Unsupported DESCRIBE statement');
    }
    current() {
        return this.tokens[this.pos];
    }
    advance() {
        return this.tokens[this.pos++];
    }
    match(type, value) {
        const token = this.current();
        if (token.type !== type)
            return false;
        if (value && token.value !== value)
            return false;
        this.advance();
        return true;
    }
    expect(type, value) {
        const token = this.current();
        if (token.type !== type || (value && token.value !== value)) {
            throw new Error(`Expected ${value ?? TokenType[type]}, got ${token.value}`);
        }
        return this.advance();
    }
    expectKeyword(value) {
        return this.expect(TokenType.KEYWORD, value);
    }
    expectIdentifier() {
        return this.expect(TokenType.IDENTIFIER).value;
    }
    parseInsert() {
        this.expectKeyword('INSERT');
        this.expectKeyword('INTO');
        const table = this.expectIdentifier();
        // column list is defined
        let columns = null;
        if (this.match(TokenType.LPAREN)) {
            columns = [];
            do {
                const column = this.expectIdentifier();
                columns.push(column);
            } while (this.match(TokenType.COMMA));
            this.expect(TokenType.RPAREN);
        }
        this.expectKeyword('VALUES');
        this.expect(TokenType.LPAREN);
        const values = [];
        do {
            const expr = this.parseValue();
            values.push(expr);
        } while (this.match(TokenType.COMMA));
        this.expect(TokenType.RPAREN);
        // safety check if columns are defined
        if (columns && columns.length !== values.length) {
            throw new Error(`Column count (${columns.length}) does not match value count (${values.length})`);
        }
        return {
            kind: 'INSERT',
            table,
            columns,
            values
        };
    }
    parseValue() {
        const token = this.current();
        switch (token.type) {
            case TokenType.NUMBER:
                this.advance();
                return Number(token.value);
            case TokenType.STRING:
                this.advance();
                return token.value;
            case TokenType.KEYWORD:
                if (token.value === 'NULL') {
                    this.advance();
                    return null;
                }
        }
        throw new Error(`Invalid value: ${token.value}`);
    }
    parseUpdate() {
        this.expectKeyword('UPDATE');
        const table = this.expectIdentifier();
        this.expectKeyword('SET');
        const set = {};
        do {
            const column = this.expectIdentifier();
            this.expect(TokenType.OPERATOR, '=');
            set[column] = this.parseValue();
        } while (this.match(TokenType.COMMA));
        let where;
        if (this.match(TokenType.KEYWORD, 'WHERE')) {
            where = this.parseWhereExpression();
        }
        else {
            throw new Error('UPDATE without WHERE is not allowed');
        }
        return {
            kind: 'UPDATE',
            table,
            set,
            where
        };
    }
    parseDelete() {
        this.expectKeyword('DELETE');
        this.expectKeyword('FROM');
        const table = this.expectIdentifier();
        if (!this.match(TokenType.KEYWORD, 'WHERE'))
            throw new Error('DELETE without WHERE is not allowed');
        const where = this.parseWhereExpression();
        return {
            kind: 'DELETE',
            table,
            where
        };
    }
    parseSelect() {
        this.expectKeyword('SELECT');
        const distinct = this.match(TokenType.KEYWORD, 'DISTINCT');
        const columns = this.parseColumnList();
        this.expectKeyword('FROM');
        const table = this.expectIdentifier();
        let alias;
        if (this.match(TokenType.KEYWORD, 'AS')) {
            alias = this.expectIdentifier();
        }
        else if (this.current().type === TokenType.IDENTIFIER) {
            alias = this.advance().value;
        }
        const from = { table, alias };
        const joins = [];
        while (this.current().type === TokenType.KEYWORD &&
            (this.current().value === 'INNER' ||
                this.current().value === 'LEFT' ||
                this.current().value === 'RIGHT' ||
                this.current().value === 'FULL' ||
                this.current().value === 'CROSS')) {
            const joinType = this.advance().value;
            // Optionally consume OUTER
            if (this.current().value === 'OUTER') {
                this.advance();
            }
            this.expectKeyword('JOIN');
            const joinTable = this.expectIdentifier();
            let joinAlias;
            if (this.match(TokenType.KEYWORD, 'AS')) {
                joinAlias = this.expectIdentifier();
            }
            else if (this.current().type === TokenType.IDENTIFIER) {
                joinAlias = this.advance().value;
            }
            this.expectKeyword('ON');
            const on = this.parseWhereExpression();
            joins.push({
                type: joinType,
                table: joinTable,
                alias: joinAlias,
                on
            });
        }
        let where;
        if (this.match(TokenType.KEYWORD, 'WHERE')) {
            where = this.parseWhereExpression();
        }
        let groupBy;
        if (this.match(TokenType.KEYWORD, 'GROUP')) {
            this.expectKeyword('BY');
            groupBy = [];
            do {
                groupBy.push(this.expectIdentifier());
            } while (this.match(TokenType.COMMA, ','));
        }
        let having;
        if (this.match(TokenType.KEYWORD, 'HAVING')) {
            having = this.parseWhereExpression();
        }
        let orderBy;
        if (this.match(TokenType.KEYWORD, 'ORDER')) {
            this.expectKeyword('BY');
            orderBy = this.parseOrderBy();
        }
        let limit;
        let offset;
        if (this.match(TokenType.KEYWORD, 'LIMIT')) {
            const limitToken = this.expect(TokenType.NUMBER);
            limit = Number(limitToken.value);
            if (this.match(TokenType.KEYWORD, 'OFFSET')) {
                const offsetToken = this.expect(TokenType.NUMBER);
                offset = Number(offsetToken.value);
            }
        }
        return {
            kind: 'SELECT',
            from,
            joins: joins.length ? joins : undefined,
            columns,
            where,
            distinct,
            orderBy,
            limit,
            offset,
            groupBy,
            having
        };
    }
    parseColumnList() {
        const columns = [];
        do {
            // Aggregate functions
            if (this.current().type === TokenType.KEYWORD &&
                ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].
                    includes(this.current().value.toUpperCase())) {
                const func = this.advance().value.toUpperCase();
                this.expect(TokenType.LPAREN);
                let argument;
                if (this.match(TokenType.STAR, '*'))
                    argument = '*';
                else
                    argument = this.expectIdentifier();
                this.expect(TokenType.RPAREN);
                let alias;
                if (this.match(TokenType.KEYWORD, 'AS')) {
                    alias = this.expectIdentifier();
                }
                else if (this.current().type === TokenType.IDENTIFIER) {
                    alias = this.advance().value;
                }
                columns.push({
                    type: func,
                    argument,
                    alias
                });
                continue;
            }
            // SELECT *
            if (this.match(TokenType.STAR, '*')) {
                columns.push({ type: 'COLUMN', name: '*' });
                break;
            }
            const name = this.expectIdentifier();
            let alias;
            if (this.match(TokenType.KEYWORD, 'AS')) {
                alias = this.expectIdentifier();
            }
            else if (this.current().type === TokenType.IDENTIFIER) {
                alias = this.advance().value;
            }
            columns.push({
                type: 'COLUMN',
                name,
                alias
            });
        } while (this.match(TokenType.COMMA));
        return columns;
    }
    parseWhereExpression() {
        const exprTokens = [];
        while (this.current().type !== TokenType.EOF &&
            !this.isClauseBoundary()) {
            exprTokens.push(this.advance());
        }
        exprTokens.push({
            type: TokenType.EOF,
            value: '',
            start: this.current().end,
            end: this.current().end
        });
        return new ExprParser(exprTokens).parse();
    }
    isClauseBoundary() {
        const token = this.current();
        if (token.type !== TokenType.KEYWORD)
            return false;
        return [
            // Join boundaries
            'INNER',
            'LEFT',
            'RIGHT',
            'FULL',
            'JOIN',
            'WHERE',
            'GROUP',
            'HAVING',
            'ORDER',
            'LIMIT',
            'OFFSET'
        ].includes(token.value.toUpperCase());
    }
    parseOrderBy() {
        const clauses = [];
        do {
            const column = this.expectIdentifier();
            let direction = 'ASC';
            if (this.match(TokenType.KEYWORD, 'ASC'))
                direction = 'ASC';
            else if (this.match(TokenType.KEYWORD, 'DESC'))
                direction = 'DESC';
            clauses.push({ column, direction });
        } while (this.match(TokenType.COMMA));
        return clauses;
    }
}

function sqlNot(value) {
    if (value === null)
        return null;
    return !value;
}
function sqlAnd(a, b) {
    if (a === false || b === false)
        return false;
    if (a === null || b === null)
        return null;
    return true;
}
function sqlOr(a, b) {
    if (a === true || b === true)
        return true;
    if (a === null || b === null)
        return null;
    return false;
}
function evaluate(expr, row) {
    switch (expr.kind) {
        case 'AGGREGATE': {
            const key = expr.func.toLowerCase() +
                (expr.argument ? '_' + expr.argument : '');
            return row[key];
        }
        case 'LITERAL':
            return expr.value;
        case 'IDENTIFIER': {
            // Direct match first (a.id, b.id)
            if (expr.name in row) {
                return row[expr.name];
            }
            // Try resolving unqualified column name
            const matches = Object.keys(row)
                .filter(k => k.endsWith(`.${expr.name}`));
            if (matches.length === 1) {
                return row[matches[0]];
            }
            if (matches.length > 1) {
                throw new Error(`Ambiguous column: ${expr.name}`);
            }
            return undefined;
        }
        case 'UNARY': {
            const value = evaluate(expr.right, row);
            switch (expr.operator) {
                case 'NOT':
                    return sqlNot(evaluate(expr.right, row));
                case '-':
                    return -value;
                default:
                    throw new Error(`Unsupported unary operator "${expr.operator}"`);
            }
        }
        case 'IS_NULL': {
            const value = evaluate(expr.expression, row);
            const isNull = value === null || value === undefined;
            return expr.not ? !isNull : isNull;
        }
        case 'BINARY': {
            const left = normalize(evaluate(expr.left, row));
            const right = normalize(evaluate(expr.right, row));
            switch (expr.operator) {
                // comparison
                case '=':
                case '!=':
                case '<':
                case '<=':
                case '>':
                case '>=': {
                    if (left === null || right === null)
                        return null;
                    switch (expr.operator) {
                        case '=': return left === right;
                        case '!=': return left !== right;
                        case '<': return left < right;
                        case '<=': return left <= right;
                        case '>': return left > right;
                        case '>=': return left >= right;
                    }
                }
                case 'LIKE':
                    if (left === null || right === null)
                        return null;
                    // safe, escape regex characters first
                    const escaped = String(right).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pattern = escaped.replace(/%/g, '.*').replace(/_/g, '.');
                    const regex = new RegExp(`^${pattern}$`, 'i');
                    return regex.test(String(left));
                // logical
                case 'AND':
                    return sqlAnd(left, right);
                case 'OR':
                    return sqlOr(left, right);
                // arithmetic
                case '+': return left + right;
                case '-': return left - right;
                case '*': return left * right;
                case '/': return left / right;
                default:
                    throw new Error(`Unsupported operator "${expr.operator}"`);
            }
        }
        case 'IN': {
            const leftValue = evaluate(expr.left, row);
            const values = expr.values.map(v => evaluate(v, row));
            if (leftValue === null)
                return null;
            let found = false;
            let hasNull = false;
            for (const v of values) {
                if (v === null) {
                    hasNull = true;
                }
                else if (v === leftValue) {
                    found = true;
                }
            }
            if (found)
                return true;
            if (hasNull)
                return null;
            return false;
        }
        case 'BETWEEN': {
            const value = evaluate(expr.value, row);
            const lower = evaluate(expr.lower, row);
            const upper = evaluate(expr.upper, row);
            if (value === null || lower === null || upper === null)
                return null;
            return value >= lower && value <= upper;
        }
        case 'GROUP':
            return evaluate(expr.expression, row);
        default:
            throw new Error(`Unknown WHERE expression. There might be a syntax error in your query!`);
    }
}

class Table {
    name;
    columns;
    rows;
    indexes = new Map();
    autoIncrementCounters = {};
    constructor(name, columns, rows) {
        this.name = name;
        this.columns = columns;
        this.rows = rows;
        for (const c of columns) {
            if (c.primary || c.unique) {
                this.indexes.set(c.name, new Map());
            }
            if (c.autoIncrement) {
                if (!c.primary) {
                    throw new Error('AUTO_INCREMENT must be PRIMARY KEY');
                }
                const autoCols = columns.filter(c => c.autoIncrement);
                if (autoCols.length > 1) {
                    throw new Error('Only one AUTO_INCREMENT column allowed per table');
                }
                if (c.type !== 'INT') {
                    throw new Error('AUTO_INCREMENT only allowed on INT columns');
                }
                this.autoIncrementCounters[c.name] = 1;
            }
        }
    }
    insert(row) {
        for (const col of this.columns) {
            // AUTO_INCREMENT
            if (col.autoIncrement) {
                if (row[col.name] == null) {
                    const next = this.autoIncrementCounters[col.name];
                    row[col.name] = next;
                    this.autoIncrementCounters[col.name]++;
                }
                else {
                    // update counter safely if manual value inserted, 
                    const manualValue = row[col.name];
                    if (manualValue >= this.autoIncrementCounters[col.name]) {
                        this.autoIncrementCounters[col.name] = manualValue + 1;
                    }
                }
            }
            if (col.primary || col.unique) {
                const idx = this.indexes.get(col.name);
                if (idx.has(row[col.name])) {
                    throw new Error(`Duplicate value '${row[col.name]}' 
                for column ${col.primary ? 'primary key' : 'unique'} column '${col.name}'
            `);
                }
            }
        }
        // insert into indexes after validation
        for (const col of this.columns) {
            if (col.primary || col.unique) {
                const idx = this.indexes.get(col.name);
                idx.set(row[col.name], row);
            }
        }
        this.rows.push(row);
    }
    applyAlter(action) {
        switch (action.type) {
            case 'ADD_COLUMN': {
                if (this.columns.some(c => c.name === action.column.name)) {
                    throw new Error('Column already exists');
                }
                this.columns.push(action.column);
                // initialize existing rows
                for (const row of this.rows) {
                    row[action.column.name] = null;
                }
                break;
            }
            case 'DROP_COLUMN': {
                const idx = this.columns.findIndex(c => c.name === action.column);
                if (idx === -1)
                    throw new Error('Column not found');
                const col = this.columns[idx];
                if (col.primary)
                    throw new Error('Cannot drop PRIMARY KEY');
                this.columns.splice(idx, 1);
                for (const row of this.rows) {
                    delete row[action.column];
                }
                break;
            }
            case 'RENAME_COLUMN': {
                const col = this.columns.find(c => c.name === action.from);
                if (!col)
                    throw new Error('Column not found');
                if (this.columns.some(c => c.name === action.to)) {
                    throw new Error('Target column already exists');
                }
                col.name = action.to;
                for (const row of this.rows) {
                    row[action.to] = row[action.from];
                    delete row[action.from];
                }
                break;
            }
        }
    }
}

class IndexedDbService {
    db;
    opened = false;
    async open() {
        if (this.opened)
            return;
        if (typeof window === 'undefined' || !window.indexedDB)
            return;
        this.opened = true;
        return new Promise((resolve, reject) => {
            const req = window.indexedDB.open('front-sql', 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                // tables store
                if (!db.objectStoreNames.contains('tables'))
                    db.createObjectStore('tables');
                // files store
                if (!db.objectStoreNames.contains('files')) {
                    const fileStore = db.createObjectStore('files', {
                        keyPath: 'id'
                    });
                    // index by database/table for faster queries
                    fileStore.createIndex('by_table', 'tableRef');
                }
            };
            req.onsuccess = () => {
                this.db = req.result;
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
    }
    async saveTable(name, data) {
        return new Promise((resolve, reject) => {
            if (!this.db)
                return resolve();
            const tx = this.db.transaction('tables', 'readwrite');
            tx.objectStore('tables').put(data, name);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    async loadTable(name) {
        return new Promise(resolve => {
            if (!this.db)
                return resolve(null);
            const tx = this.db.transaction('tables');
            const req = tx.objectStore('tables').get(name);
            req.onsuccess = () => resolve(req.result);
        });
    }
    async deleteTable(name) {
        return new Promise((resolve, reject) => {
            if (!this.db)
                return resolve();
            const tx = this.db.transaction('tables', 'readwrite');
            const store = tx.objectStore('tables');
            store.delete(name);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }
    async tableExists(name) {
        return new Promise(resolve => {
            if (!this.db)
                return resolve(false);
            const tx = this.db.transaction('tables', 'readonly');
            const req = tx.objectStore('tables').get(name);
            req.onsuccess = () => resolve(!!req.result);
            req.onerror = () => resolve(false);
        });
    }
    async iterateKeys(cb) {
        return new Promise(resolve => {
            const tx = this.db.transaction('tables');
            const store = tx.objectStore('tables');
            const req = store.openCursor();
            req.onsuccess = () => {
                const cursor = req.result;
                if (!cursor)
                    return resolve();
                cb(cursor.key);
                cursor.continue();
            };
        });
    }
    async deleteByPrefix(prefix) {
        const tx = this.db.transaction('tables', 'readwrite');
        const store = tx.objectStore('tables');
        const req = store.openCursor();
        req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor)
                return;
            const key = cursor.key;
            if (typeof key === 'string' && key.startsWith(prefix))
                cursor.delete();
            cursor.continue();
        };
    }
    async saveFile(file) {
        return new Promise((resolve, reject) => {
            if (!this.db)
                return resolve();
            const tx = this.db.transaction('files', 'readwrite');
            tx.objectStore('files').put(file);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    async deleteFile(id) {
        return new Promise((resolve, reject) => {
            if (!this.db)
                return resolve();
            const tx = this.db.transaction('files', 'readwrite');
            tx.objectStore('files').delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }
    async loadFile(id) {
        return new Promise(resolve => {
            if (!this.db)
                return resolve(null);
            const tx = this.db.transaction('files', 'readonly');
            const req = tx.objectStore('files').get(id);
            req.onsuccess = () => resolve(req.result);
        });
    }
    async loadFilesByTable(tableRef) {
        return new Promise(resolve => {
            if (!this.db)
                return resolve(null);
            const tx = this.db.transaction('files', 'readonly');
            const index = tx.objectStore('files').index('by_table');
            const req = index.getAll(tableRef);
            req.onsuccess = () => resolve(req.result);
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: IndexedDbService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: IndexedDbService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: IndexedDbService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }] });

class DatabaseService {
    store;
    currentDB = 'DEFAULT';
    databases = new Set();
    tables = new Map();
    constructor(store) {
        this.store = store;
        this.init();
    }
    async init() {
        await this.store.open();
        const saved = await this.store.loadTable('__databases__');
        if (saved) {
            this.databases = new Set(saved);
        }
        else {
            this.databases.add('DEFAULT');
            await this.persistDatabases();
        }
        await this.useDatabase('DEFAULT');
    }
    async useDatabase(name) {
        if (!this.databases.has(name)) {
            throw new Error(`Database ${name} does not exist`);
        }
        this.currentDB = name;
        this.tables.clear();
    }
    async persistDatabases() {
        await this.store.saveTable('__databases__', [...this.databases]);
    }
    async createDatabase(name) {
        if (this.databases.has(name))
            return;
        this.databases.add(name);
        await this.persistDatabases();
    }
    async listDatabases() {
        return [...this.databases];
    }
    async saveFile(file, tableName, columnName, foreignKeyValue) {
        const tableRef = `${this.currentDB}::${tableName}`;
        const id = `${tableRef}.${columnName}=${foreignKeyValue}`;
        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        const newFile = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: uint8,
            id,
            tableRef,
            column: columnName,
            foreignKeyValue
        };
        await this.store.saveFile(newFile);
        return newFile;
    }
    async deleteFile(tableName, columnName, foreignKeyValue) {
        const id = `${this.currentDB}::${tableName}.${columnName}=${foreignKeyValue}`;
        await this.store.deleteFile(id);
        return true;
    }
    async loadFile(tableName, columnName, foreignKeyValue) {
        const id = `${this.currentDB}::${tableName}.${columnName}=${foreignKeyValue}`;
        const file = await this.store.loadFile(id);
        if (!file)
            throw new Error(`The file '${id}' does not exist`);
        return file;
    }
    async loadFilesByTable(tableName) {
        const tableRef = `${this.currentDB}::${tableName}`;
        const files = await this.store.loadFilesByTable(tableRef);
        return files;
    }
    async listTables() {
        const prefix = `${this.currentDB}::`;
        const tables = [];
        await this.store.iterateKeys(key => {
            if (typeof key === 'string' && key.startsWith(prefix)) {
                tables.push(key.replace(prefix, ''));
            }
        });
        return tables;
    }
    async dropDatabase(name) {
        if (name === 'DEFAULT') {
            throw new Error('Cannot drop DEFAULT database');
        }
        if (!this.databases.has(name))
            return;
        this.databases.delete(name);
        await this.persistDatabases();
        // delete all tables belonging to this DB
        await this.store.deleteByPrefix(`${name}::`);
        if (this.currentDB === name) {
            await this.useDatabase('DEFAULT');
        }
    }
    async createTable(name, columns) {
        const key = `${this.currentDB}::${name}`;
        if (this.tables.has(name))
            return;
        const table = new Table(name, columns, []);
        const saved = await this.store.loadTable(key);
        if (saved)
            Object.assign(table, saved);
        this.tables.set(name, table); // insert into memory
        await this.store.saveTable(key, this.tables.get(name)); // insert into IndexedDB (from memory)
    }
    async dropTable(tableName) {
        const key = `${this.currentDB}::${tableName}`;
        const exists = await this.store.tableExists(key);
        if (!exists) {
            throw new Error(`Table '${tableName}' does not exist`);
        }
        await this.store.deleteTable(key); // remove from IndexedDB
        this.tables.delete(tableName); // remove from memory
    }
    async renameTable(oldName, newName) {
        if (this.tables.has(newName)) {
            throw new Error('Target table already exists');
        }
        const oldKey = `${this.currentDB}::${oldName}`;
        const newKey = `${this.currentDB}::${newName}`;
        const table = await this.table(oldName);
        table.name = newName; // update table object  
        await this.store.saveTable(newKey, table); // persist under new key    
        await this.store.deleteByPrefix(oldKey); // remove old key
        this.tables.delete(oldName); // update in-memory map
        this.tables.set(newName, table);
        return table;
    }
    resolveColumn(row, column) {
        if (!row)
            return undefined;
        // direct match (aggregated rows hit here)
        if (column in row)
            return row[column];
        // fully-qualified column (a.name)
        if (column.includes('.') && column in row)
            return row[column];
        // try suffix match (alias.column)
        const matches = Object.keys(row).filter(k => k.endsWith('.' + column));
        if (matches.length === 1)
            return row[matches[0]];
        if (matches.length > 1)
            throw new Error(`Ambiguous column '${column}'`);
        return undefined;
    }
    processSelectRows(rows, where, columns = [{ type: 'COLUMN', name: '*' }], distinct = false, orderBy, limit, offset, groupBy, having) {
        if (where) {
            rows = rows.filter(row => evaluate(where, new Proxy(row, {
                get: (target, prop) => this.resolveColumn(target, prop)
            })) === true);
        }
        // GROUP BY
        if (groupBy && groupBy.length > 0) {
            const groups = new Map();
            for (const row of rows) {
                const key = JSON.stringify(groupBy.map(col => this.resolveColumn(row, col)));
                if (!groups.has(key)) {
                    groups.set(key, []);
                }
                groups.get(key).push(row);
            }
            const result = [];
            for (const [, groupRows] of groups) {
                const aggregatedRow = {};
                for (const col of columns) {
                    // Regular column (must be grouped column)
                    if (col.type === 'COLUMN') {
                        const key = col.alias ?? col.name;
                        aggregatedRow[key] = this.resolveColumn(groupRows[0], col.name);
                    }
                    // Aggregate column
                    else {
                        const defaultKey = col.type.toLowerCase() +
                            (col.argument ? '_' + col.argument : '');
                        const key = col.alias ?? defaultKey;
                        aggregatedRow[key] = this.computeAggregate(col, groupRows);
                    }
                }
                result.push(aggregatedRow);
            }
            rows = result;
            if (having) {
                rows = rows.filter(row => evaluate(having, new Proxy(row, {
                    get: (target, prop) => this.resolveColumn(target, prop)
                })) === true);
            }
        }
        const hasAggregate = columns.some(c => c.type !== 'COLUMN');
        const hasRegularColumn = columns.some(c => c.type === 'COLUMN' && c.name !== '*');
        if (hasAggregate && hasRegularColumn && !groupBy) {
            throw new Error('Mixing aggregate and non-aggregate columns requires GROUP BY');
        }
        if (hasAggregate && !groupBy) {
            const result = {};
            for (const col of columns) {
                if (col.type === 'COLUMN')
                    continue;
                const key = col.alias ?? col.type.toLowerCase() + '_' + col.argument;
                result[key] = this.computeAggregate(col, rows);
            }
            return [result];
        }
        // DISTINCT
        if (distinct) {
            const seen = new Set();
            rows = rows.filter(row => {
                const key = JSON.stringify(row);
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            });
        }
        // ORDER BY
        if (orderBy && orderBy.length > 0) {
            rows = [...rows].sort((a, b) => {
                for (const clause of orderBy) {
                    const { column, direction } = clause;
                    const valA = this.resolveColumn(a, column);
                    const valB = this.resolveColumn(b, column);
                    if (valA < valB)
                        return direction === 'ASC' ? -1 : 1;
                    if (valA > valB)
                        return direction === 'ASC' ? 1 : -1;
                }
                return 0;
            });
        }
        // LIMIT / OFFSET
        if (typeof limit === 'number') {
            const start = offset ?? 0;
            const end = start + limit;
            rows = rows.slice(start, end);
        }
        if (columns.length === 1 &&
            columns[0].type === 'COLUMN' &&
            columns[0].name === '*') {
            return rows;
        }
        // projection
        return rows.map(row => {
            const projected = {};
            for (const col of columns) {
                if (col.type === 'COLUMN') {
                    const outputName = col.alias ?? col.name;
                    projected[outputName] = this.resolveColumn(row, col.name);
                }
                else {
                    const key = col.type.toLowerCase() +
                        (col.argument ? '_' + col.argument : '');
                    const outputName = col.alias ?? key;
                    projected[outputName] = row[outputName];
                }
            }
            return projected;
        });
    }
    async select(from, joins, where, columns = [{ type: 'COLUMN', name: '*' }], distinct = false, orderBy, limit, offset, groupBy, having) {
        const baseTable = await this.table(from.table);
        const baseAlias = from.alias ?? from.table;
        let rows = baseTable.rows.map(r => this.prefixRow(r, baseAlias));
        // Apply joins sequentially (chaining)
        for (const join of joins ?? []) {
            const joinTable = await this.table(join.table);
            rows = this.applyJoin(rows, join, joinTable);
        }
        return this.processSelectRows(rows, where, columns, distinct, orderBy, limit, offset, groupBy, having);
    }
    applyJoin(leftRows, join, joinTable) {
        const joinAlias = join.alias ?? join.table;
        const rightRows = joinTable.rows.map(r => this.prefixRow(r, joinAlias));
        // CROSS JOIN FIRST
        if (join.type === 'CROSS') {
            const result = [];
            for (const leftRow of leftRows) {
                for (const rightRow of rightRows) {
                    result.push({ ...leftRow, ...rightRow });
                }
            }
            return result;
        }
        const result = [];
        const matchedRightIndexes = new Set();
        for (const leftRow of leftRows) {
            let matched = false;
            for (let rIndex = 0; rIndex < rightRows.length; rIndex++) {
                const rightRow = rightRows[rIndex];
                const merged = { ...leftRow, ...rightRow };
                if (evaluate(join.on, merged) === true) {
                    matched = true;
                    matchedRightIndexes.add(rIndex);
                    result.push(merged);
                }
            }
            // LEFT and FULL need unmatched LEFT rows
            if (!matched && (join.type === 'LEFT' || join.type === 'FULL')) {
                result.push({
                    ...leftRow,
                    ...this.buildNullRow(joinAlias, joinTable)
                });
            }
        }
        // RIGHT and FULL need unmatched RIGHT rows
        if (join.type === 'RIGHT' || join.type === 'FULL') {
            const nullLeft = this.buildNullFromExisting(leftRows);
            for (let rIndex = 0; rIndex < rightRows.length; rIndex++) {
                if (!matchedRightIndexes.has(rIndex)) {
                    result.push({
                        ...nullLeft,
                        ...rightRows[rIndex]
                    });
                }
            }
        }
        return result;
    }
    buildNullRow(alias, table) {
        const nullRow = {};
        for (const col of table.columns) {
            nullRow[`${alias}.${col.name}`] = null;
        }
        return nullRow;
    }
    buildNullFromExisting(rows) {
        const nullRow = {};
        if (rows.length === 0)
            return nullRow;
        for (const key of Object.keys(rows[0])) {
            nullRow[key] = null;
        }
        return nullRow;
    }
    prefixRow(row, prefix) {
        const result = {};
        for (const key in row)
            result[`${prefix}.${key}`] = row[key];
        return result;
    }
    computeAggregate(col, rows) {
        switch (col.type) {
            case 'COUNT': {
                if (col.argument === '*') {
                    return rows.length;
                }
                return rows.filter(r => this.resolveColumn(r, col.argument) !== null).length;
            }
            case 'SUM': {
                const values = rows
                    .map(r => this.resolveColumn(r, col.argument))
                    .filter(v => typeof v === 'number');
                return values.reduce((acc, v) => acc + v, 0);
            }
            case 'AVG': {
                const values = rows
                    .map(r => this.resolveColumn(r, col.argument))
                    .filter(v => typeof v === 'number');
                if (values.length === 0)
                    return null;
                const sum = values.reduce((acc, v) => acc + v, 0);
                return sum / values.length;
            }
            case 'MIN': {
                const values = rows
                    .map(r => this.resolveColumn(r, col.argument))
                    .filter(v => v !== null && v !== undefined);
                if (values.length === 0)
                    return null;
                return values.reduce((min, v) => (v < min ? v : min));
            }
            case 'MAX': {
                const values = rows
                    .map(r => this.resolveColumn(r, col.argument))
                    .filter(v => v !== null && v !== undefined);
                if (values.length === 0)
                    return null;
                return values.reduce((max, v) => (v > max ? v : max));
            }
            default:
                throw new Error(`Unsupported aggregate type '${col.type}'`);
        }
    }
    async insert(tableName, row) {
        const table = await this.table(tableName);
        const validRow = this.validateRow(row, table);
        table.insert(validRow);
        await this.persist(tableName);
        return table;
    }
    validateRow(row, table) {
        const result = {};
        const columns = table.columns;
        for (const col of columns) {
            const value = row[col.name];
            // PRIMARY KEY must exist
            if (col.primary &&
                !col.autoIncrement &&
                (value === undefined || value === null)) {
                throw new Error(`Primary key '${col.name}' cannot be null`);
            }
            // Default undefined = null
            const finalValue = value === undefined
                ? null
                : this.coerceType(value, col.type, col.name);
            if (value === undefined) {
                result[col.name] = null;
                continue;
            }
            result[col.name] = finalValue;
        }
        // reject unknown columns
        for (const key of Object.keys(row)) {
            if (!columns.find(c => c.name === key)) {
                throw new Error(`Unknown column '${key}'`);
            }
        }
        return result;
    }
    coerceType(value, type, columnName) {
        if (value === null)
            return null;
        switch (type) {
            case 'INT': {
                if (typeof value === 'number') {
                    if (!Number.isInteger(value)) {
                        throw new Error(`Column '${columnName}' expects INT`);
                    }
                    return value;
                }
                if (typeof value === 'string' && /^\d+$/.test(value)) {
                    return parseInt(value, 10);
                }
                throw new Error(`Invalid INT value for column '${columnName}'`);
            }
            case 'TEXT': {
                if (typeof value === 'string')
                    return value;
                return String(value);
            }
            case 'BLOB': {
                if (value instanceof Uint8Array)
                    return value;
                throw new Error(`Column '${columnName}' expects BLOB`);
            }
            default:
                throw new Error(`Unknown column type '${type}'`);
        }
    }
    async persist(name) {
        const key = `${this.currentDB}::${name}`;
        this.store.saveTable(key, this.tables.get(name));
    }
    async table(name) {
        let table = this.tables.get(name); // try loading table from memory
        if (!table) // table does not exist in memory
            table = await this.loadTable(name); // try loading table from disk, i.e., IndexedDB
        return table;
    }
    async loadTable(name) {
        const key = `${this.currentDB}::${name}`; // tables load from current DB
        const saved = await this.store.loadTable(key);
        if (!saved) {
            throw new Error(`Table ${name} does not exist`);
        }
        const table = new Table(//initialize a table model from saved table's data
        saved.name, saved.columns, saved.rows ?? []);
        this.tables.set(name, table); // add table model initialized from disk to memory
        return table;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: DatabaseService, deps: [{ token: IndexedDbService }], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: DatabaseService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: DatabaseService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }], ctorParameters: () => [{ type: IndexedDbService }] });

class SqlEngineService {
    db;
    constructor(db) {
        this.db = db;
    }
    async execute(sql) {
        const tokens = new SqlLexer(sql).tokenize();
        const ast = new SqlParser(tokens).parse();
        return this.executeAst(ast);
    }
    async executeAst(stmt) {
        switch (stmt.kind) {
            case 'CREATE_DATABASE':
                await this.db.createDatabase(stmt.name);
                return `Database ${stmt.name} created`;
            case 'DROP_DATABASE':
                await this.db.dropDatabase(stmt.name);
                return `Database ${stmt.name} dropped`;
            case 'SHOW_DATABASES':
                return await this.db.listDatabases();
            case 'USE_DATABASE':
                await this.db.useDatabase(stmt.name);
                return `Using database ${stmt.name}`;
            case 'SHOW_TABLES': {
                const tables = await this.db.listTables();
                return {
                    type: 'TABLE_LIST',
                    tables
                };
            }
            case 'DROP_TABLE': {
                await this.db.dropTable(stmt.table);
                return `Table ${stmt.table} dropped`;
            }
            case 'ALTER_TABLE': {
                const action = stmt.actions[0];
                if (action.type === 'RENAME_TABLE') {
                    const table = await this.db.renameTable(stmt.table, action.to);
                    return {
                        type: 'TABLE_SCHEMA',
                        table: table.name,
                        columns: table.columns
                    };
                }
                const table = await this.db.table(stmt.table);
                for (const a of stmt.actions) {
                    table.applyAlter(a);
                }
                this.db.persist(table.name);
                return {
                    type: 'TABLE_SCHEMA',
                    table: table.name,
                    columns: table.columns
                };
            }
            case 'CREATE_TABLE': {
                await this.db.createTable(stmt.table, stmt.columns.map(c => ({
                    name: c.name,
                    type: c.datatype,
                    primary: c.primary,
                    unique: c.unique,
                    autoIncrement: c.autoIncrement
                })));
                const table = await this.db.table(stmt.table);
                return {
                    type: 'TABLE_SCHEMA',
                    table: table.name,
                    columns: table.columns
                };
            }
            case 'DESCRIBE_TABLE': {
                const table = await this.db.table(stmt.table);
                return {
                    type: 'TABLE_SCHEMA',
                    table: table.name,
                    columns: table.columns
                };
            }
            case 'INSERT': {
                const row = {};
                const table = await this.db.table(stmt.table);
                if (stmt.columns) {
                    stmt.columns.forEach((col, i) => {
                        row[col] = stmt.values[i];
                    });
                }
                else {
                    table.columns.forEach((c, i) => {
                        row[c.name] = stmt.values[i];
                    });
                }
                const updated = await this.db.insert(stmt.table, row);
                return {
                    type: 'TABLE_DATA',
                    table: updated.name,
                    rows: updated.rows
                };
            }
            case 'SELECT': {
                const rows = await this.db.select(stmt.from, stmt.joins, stmt.where, stmt.columns, stmt.distinct ?? false, stmt.orderBy, stmt.limit, stmt.offset, stmt.groupBy, stmt.having);
                return {
                    type: 'TABLE_DATA',
                    table: stmt.from.table,
                    rows
                };
            }
            case 'UPDATE': {
                const table = await this.db.table(stmt.table);
                for (const row of table.rows) {
                    if (!stmt.where || evaluate(stmt.where, row)) {
                        Object.assign(row, stmt.set);
                    }
                }
                await this.db.persist(table.name);
                return {
                    type: 'TABLE_DATA',
                    table: table.name,
                    rows: table.rows
                };
            }
            case 'DELETE': {
                const table = await this.db.table(stmt.table);
                table.rows = table.rows.filter(row => !stmt.where || !evaluate(stmt.where, row));
                await this.db.persist(table.name);
                return {
                    type: 'TABLE_DATA',
                    table: table.name,
                    rows: table.rows
                };
            }
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: SqlEngineService, deps: [{ token: DatabaseService }], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: SqlEngineService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: SqlEngineService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }], ctorParameters: () => [{ type: DatabaseService }] });

class JsonTreeComponent {
    data;
    expanded = true;
    toggle() {
        this.expanded = !this.expanded;
    }
    isObject(value) {
        return value !== null && typeof value === 'object';
    }
    keys(obj) {
        return Object.keys(obj);
    }
    isArray(value) {
        return Array.isArray(value);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: JsonTreeComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.16", type: JsonTreeComponent, isStandalone: true, selector: "app-json-tree", inputs: { data: "data" }, ngImport: i0, template: "@if (isObject(data)) {\r\n    <div class=\"tree-node\">\r\n  \r\n      <div class=\"node-header\" (click)=\"toggle()\">\r\n        <span class=\"arrow\">\r\n          {{ expanded ? '\u25BC' : '\u25B6' }}\r\n        </span>\r\n  \r\n        <span class=\"type\">\r\n          {{ isArray(data) ? 'Array' : 'Object' }}\r\n        </span>\r\n  \r\n        <span class=\"size\">\r\n          ({{ keys(data).length }})\r\n        </span>\r\n      </div>\r\n  \r\n      @if (expanded) {\r\n        <div class=\"node-content\">\r\n  \r\n          @for (key of keys(data); track key) {\r\n            <div class=\"node-entry\">\r\n              <span class=\"key\">{{ key }}</span>\r\n              <span class=\"colon\">:</span>\r\n  \r\n              <app-json-tree [data]=\"data[key]\"></app-json-tree>\r\n            </div>\r\n          }\r\n  \r\n        </div>\r\n      }\r\n  \r\n    </div>\r\n  } @else {\r\n    <span class=\"primitive\">\r\n      {{ data }}\r\n    </span>\r\n  }", styles: [".tree-node{font-family:Courier New,monospace;font-size:13px;color:#0f8;margin-left:14px}.node-header{cursor:pointer;-webkit-user-select:none;user-select:none;color:#0fa;text-shadow:0 0 6px #00ff88}.node-header:hover{color:#3fc}.arrow{margin-right:6px}.type{color:#0f8}.size{color:#064;margin-left:6px}.node-content{margin-left:16px;border-left:1px solid #003322;padding-left:12px}.node-entry{margin:4px 0}.key{color:#0fa}.colon{margin:0 6px;color:#042}.primitive{color:#6f6}\n"], dependencies: [{ kind: "component", type: JsonTreeComponent, selector: "app-json-tree", inputs: ["data"] }, { kind: "ngmodule", type: CommonModule }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: JsonTreeComponent, decorators: [{
            type: Component,
            args: [{ selector: 'app-json-tree', standalone: true, imports: [CommonModule, JsonTreeComponent], template: "@if (isObject(data)) {\r\n    <div class=\"tree-node\">\r\n  \r\n      <div class=\"node-header\" (click)=\"toggle()\">\r\n        <span class=\"arrow\">\r\n          {{ expanded ? '\u25BC' : '\u25B6' }}\r\n        </span>\r\n  \r\n        <span class=\"type\">\r\n          {{ isArray(data) ? 'Array' : 'Object' }}\r\n        </span>\r\n  \r\n        <span class=\"size\">\r\n          ({{ keys(data).length }})\r\n        </span>\r\n      </div>\r\n  \r\n      @if (expanded) {\r\n        <div class=\"node-content\">\r\n  \r\n          @for (key of keys(data); track key) {\r\n            <div class=\"node-entry\">\r\n              <span class=\"key\">{{ key }}</span>\r\n              <span class=\"colon\">:</span>\r\n  \r\n              <app-json-tree [data]=\"data[key]\"></app-json-tree>\r\n            </div>\r\n          }\r\n  \r\n        </div>\r\n      }\r\n  \r\n    </div>\r\n  } @else {\r\n    <span class=\"primitive\">\r\n      {{ data }}\r\n    </span>\r\n  }", styles: [".tree-node{font-family:Courier New,monospace;font-size:13px;color:#0f8;margin-left:14px}.node-header{cursor:pointer;-webkit-user-select:none;user-select:none;color:#0fa;text-shadow:0 0 6px #00ff88}.node-header:hover{color:#3fc}.arrow{margin-right:6px}.type{color:#0f8}.size{color:#064;margin-left:6px}.node-content{margin-left:16px;border-left:1px solid #003322;padding-left:12px}.node-entry{margin:4px 0}.key{color:#0fa}.colon{margin:0 6px;color:#042}.primitive{color:#6f6}\n"] }]
        }], propDecorators: { data: [{
                type: Input
            }] } });

class SqlConsoleComponent {
    engine;
    sqlInput;
    sql = new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(5)]
    });
    output;
    history = [];
    showHistory = false;
    constructor(engine) {
        this.engine = engine;
    }
    async run() {
        const query = this.sql.value.trim();
        if (!query)
            return;
        try {
            this.output = await this.engine.execute(query);
            if (this.history[this.history.length - 1] !== query) {
                this.history.unshift(query);
            }
            this.showHistory = false;
        }
        catch (e) {
            this.output = { error: e.message };
        }
    }
    focusInput() {
        this.sqlInput.nativeElement.focus();
    }
    onKeyDown(event) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlKeyPressed = isMac ? event.metaKey : event.ctrlKey;
        if (ctrlKeyPressed && event.key === 'Enter') {
            event.preventDefault();
            this.run();
        }
        if (ctrlKeyPressed && event.key.toLowerCase() === 'l') {
            event.preventDefault();
            this.clear();
        }
        if (ctrlKeyPressed && event.key.toLowerCase() === 'h') {
            event.preventDefault();
            this.toggleHistory();
        }
        if (!ctrlKeyPressed && event.key === '\\') {
            event.preventDefault();
            this.focusInput();
        }
    }
    clear() {
        this.sql.reset('');
        // this.output = null
        this.showHistory = false;
    }
    toggleHistory() {
        this.showHistory = !this.showHistory;
    }
    loadFromHistory(query) {
        this.sql.setValue(query);
        this.showHistory = false;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: SqlConsoleComponent, deps: [{ token: SqlEngineService }], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.16", type: SqlConsoleComponent, isStandalone: true, selector: "app-sql-console", host: { listeners: { "window:keydown": "onKeyDown($event)" } }, viewQueries: [{ propertyName: "sqlInput", first: true, predicate: ["sqlInput"], descendants: true }], ngImport: i0, template: "<div class=\"sql-console\">\r\n    <h2><span class=\"logo-text\">FrontSQL</span> Cyber Terminal</h2>\r\n    <p class=\"hint\"><span>'<code>\\</code>' : Focus Input</span><span>'<code>Ctrl+Enter</code>' : Run</span><span>'<code>Ctrl+L</code>' : Clear</span><span>'<code>Ctrl+H</code>' : Toggle History</span></p>\r\n\r\n    <div class=\"console-textarea\">\r\n      <textarea \r\n        #sqlInput\r\n        [formControl]=\"sql\" \r\n        rows=\"10\" \r\n        placeholder=\"Enter SQL:\"\r\n        class=\"console-input\"\r\n      ></textarea>\r\n    </div>   \r\n\r\n    <div class=\"console-btns\">\r\n        <button (click)=\"run()\" [disabled]=\"sql.invalid || showHistory\">\u25B6 RUN</button>\r\n        <button (click)=\"clear()\" [disabled]=\"!sql.value\">CLEAR</button>\r\n        <button (click)=\"toggleHistory()\" [disabled]=\"!history.length\">HISTORY</button>\r\n    </div>\r\n</div>\r\n\r\n<div class=\"sql-output\">\r\n  @if (output && !output.error) {\r\n    <h3 class=\"json-tree-header\">JSON Tree: <span class=\"header-descr\">{{ output.table }}</span></h3>\r\n    <div class=\"json-tree\">\r\n      <app-json-tree [data]=\"output\"></app-json-tree>\r\n    </div>\r\n  }    \r\n    \r\n  @if (output?.type === \"TABLE_SCHEMA\") {\r\n      <div class=\"output-content\">\r\n          <h3 class=\"table-header\">Table: {{ output.table }}</h3>      \r\n          <table>\r\n            <thead>\r\n              <tr>\r\n                <th>Column</th>\r\n                <th>Type</th>\r\n                <th>Primary</th>\r\n                <th>Unique</th>\r\n              </tr>\r\n            </thead>\r\n            <tbody>\r\n              @for (c of output.columns; track c.name) {\r\n                  <tr>\r\n                    <td>{{ c.name }}</td>\r\n                    <td>{{ c.type }}</td>\r\n\r\n                    @if (c.primary) {\r\n                      <td>{{ c.primary }}</td>\r\n                    } @else {\r\n                      <td>_</td>\r\n                    }  \r\n                                        \r\n                    @if (c.unique) {\r\n                      <td>{{ c.unique }}</td>\r\n                    } @else {\r\n                      @if (c.primary) {\r\n                        <td>{{ c.primary }}</td>\r\n                      } @else {\r\n                        <td>_</td>\r\n                      }\r\n                    }\r\n                  </tr>\r\n              }            \r\n            </tbody>\r\n          </table>\r\n      </div>      \r\n  }\r\n  \r\n  @if (output?.type === 'TABLE_DATA') {\r\n      <div>\r\n          <h3 class=\"table-header\">Table: <span class=\"header-descr\">{{ output.table }}</span></h3>\r\n          @if (output.rows.length) {\r\n              <table>\r\n                  <thead>\r\n                    <tr>\r\n                      @for (key of output.rows[0] | keyvalue; track key) {\r\n                          <th>\r\n                              {{ key.key }}\r\n                          </th>\r\n                      }                    \r\n                    </tr>\r\n                  </thead>            \r\n                  <tbody>\r\n                      @for (row of output.rows; track row) {\r\n                          <tr>\r\n                              @for (cell of row | keyvalue; track cell) {\r\n                                  <td>\r\n                                      {{ cell.value }}\r\n                                  </td>\r\n                              }                            \r\n                          </tr>\r\n                      }                  \r\n                  </tbody>\r\n              </table>\r\n          }\r\n          @if (!output.rows.length) {\r\n              <p>Table is empty</p>\r\n          }        \r\n      </div>      \r\n  }\r\n  \r\n  @if (output?.error) {\r\n      <div class=\"error\">\r\n          {{ output.error }}\r\n      </div>\r\n  }    \r\n\r\n  @if (showHistory) {\r\n      <div class=\"history\">\r\n        <h3  class=\"table-header\">Query History</h3>\r\n    \r\n        @if (history.length) {\r\n          <ul>\r\n            @for (q of history; track q) {\r\n              <li>\r\n                <button type=\"button\" (click)=\"loadFromHistory(q)\">\r\n                  {{ q }}\r\n                </button>\r\n              </li>\r\n            }\r\n          </ul>\r\n        }\r\n      </div>\r\n    }\r\n</div>", styles: [":host{font-family:var(--terminal-font);background:#66ff6640;padding:.5rem;border-radius:10px;color:var(--terminal-text-primary);display:block;min-height:100vh}::selection{background-color:var(--terminal-text-soft);color:var(--terminal-bg)}::-moz-selection{background-color:var(--terminal-text-soft);color:var(--terminal-bg)}.logo-text{color:var(--terminal-text-bright);font-style:italic}.json-tree-header{margin-left:2rem}.table-header{margin-left:1rem}.header-descr{color:var(--terminal-text-soft)}.sql-console,.sql-output{font-family:Courier New,monospace;background:#010701fc;color:#0f8}.sql-console{margin-top:.1rem;padding:.5rem;width:inherit;display:block;justify-items:center;border:1px solid rgba(102,255,102,.95);border-radius:10px}.hint{font-size:.7rem;text-align:center}.sql-console h2,.hint span{color:var(--terminal-text-soft);text-align:center;border:1px solid rgba(0,255,136,.25);border-radius:7px;background:var(--terminal-panel);box-shadow:inset;padding:.5rem}.hint span{padding:.2rem;margin-left:.3rem;border:1px solid rgba(0,255,136,.15);color:var(--terminal-text-primary)}.sql-console h2{font-size:1.2rem;text-decoration:underline}.hint code{color:#88ee85}.console-textarea{width:100%;display:flex;justify-content:center}.console-textarea textarea{border:1px solid rgba(0,255,136,.35);border-radius:.5rem;padding:.5rem;margin:1.5rem 1rem 1rem;width:90%}.console-btns{border:1px solid rgba(0,255,136,.35);border-radius:.2rem;display:flex;margin:1rem auto;padding:.5rem 0;justify-content:center;background:var(--terminal-panel)}.console-btns button{margin:0 1rem;padding:.25rem;border-radius:7px;color:#023a20d9;font-weight:700;font-size:.75rem;cursor:pointer}.console-btns button:hover{color:#00ff88d9;background-color:#022717d9;border:1px solid rgba(0,255,136,.65)}.sql-output table{width:100%;border-collapse:collapse;margin-top:20px;background:#000;border:1px solid #003322;box-shadow:0 0 12px #00ff8826}thead{background:#001a11}th{padding:10px 14px;text-align:left;font-weight:600;color:#0fa;border-bottom:1px solid #004422;text-shadow:0 0 4px #00ff88}td{padding:10px 14px;border-bottom:1px solid #002211;color:#6f6}tbody tr:hover{background:#001a11}.sql-output p{padding:20px;color:#042}.error{margin-top:20px;padding:12px;background:#200;border:1px solid #660000;color:#f44;font-weight:700;text-shadow:0 0 6px red}.json-tree{margin-top:20px;padding:16px;background:#000;border:1px solid #003322;box-shadow:inset 0 0 15px #00ff8814}.history{border-top:1px solid rgba(255,0,0,.75);padding:1rem}.history ul{list-style:none;padding:0}.history button{background:none;border:none;border-bottom:1px solid #004422;cursor:pointer;text-align:left;padding:4px 0;color:var(--terminal-text-soft);font-family:Courier New,Courier,monospace}.sql-output{border:2px solid #00ffaa;margin-top:2rem;background:#010701f2;border-radius:7px}.console-input{background:#000;color:#0f8;border:1px solid #003322;padding:12px;font-family:Courier New,monospace;caret-color:#0f8}.console-input:focus{outline:none;box-shadow:0 0 10px #0f8}\n"], dependencies: [{ kind: "ngmodule", type: ReactiveFormsModule }, { kind: "directive", type: i2.DefaultValueAccessor, selector: "input:not([type=checkbox])[formControlName],textarea[formControlName],input:not([type=checkbox])[formControl],textarea[formControl],input:not([type=checkbox])[ngModel],textarea[ngModel],[ngDefaultControl]" }, { kind: "directive", type: i2.NgControlStatus, selector: "[formControlName],[ngModel],[formControl]" }, { kind: "directive", type: i2.FormControlDirective, selector: "[formControl]", inputs: ["formControl", "disabled", "ngModel"], outputs: ["ngModelChange"], exportAs: ["ngForm"] }, { kind: "component", type: JsonTreeComponent, selector: "app-json-tree", inputs: ["data"] }, { kind: "pipe", type: KeyValuePipe, name: "keyvalue" }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: SqlConsoleComponent, decorators: [{
            type: Component,
            args: [{ selector: 'app-sql-console', imports: [
                        KeyValuePipe,
                        ReactiveFormsModule,
                        JsonTreeComponent
                    ], template: "<div class=\"sql-console\">\r\n    <h2><span class=\"logo-text\">FrontSQL</span> Cyber Terminal</h2>\r\n    <p class=\"hint\"><span>'<code>\\</code>' : Focus Input</span><span>'<code>Ctrl+Enter</code>' : Run</span><span>'<code>Ctrl+L</code>' : Clear</span><span>'<code>Ctrl+H</code>' : Toggle History</span></p>\r\n\r\n    <div class=\"console-textarea\">\r\n      <textarea \r\n        #sqlInput\r\n        [formControl]=\"sql\" \r\n        rows=\"10\" \r\n        placeholder=\"Enter SQL:\"\r\n        class=\"console-input\"\r\n      ></textarea>\r\n    </div>   \r\n\r\n    <div class=\"console-btns\">\r\n        <button (click)=\"run()\" [disabled]=\"sql.invalid || showHistory\">\u25B6 RUN</button>\r\n        <button (click)=\"clear()\" [disabled]=\"!sql.value\">CLEAR</button>\r\n        <button (click)=\"toggleHistory()\" [disabled]=\"!history.length\">HISTORY</button>\r\n    </div>\r\n</div>\r\n\r\n<div class=\"sql-output\">\r\n  @if (output && !output.error) {\r\n    <h3 class=\"json-tree-header\">JSON Tree: <span class=\"header-descr\">{{ output.table }}</span></h3>\r\n    <div class=\"json-tree\">\r\n      <app-json-tree [data]=\"output\"></app-json-tree>\r\n    </div>\r\n  }    \r\n    \r\n  @if (output?.type === \"TABLE_SCHEMA\") {\r\n      <div class=\"output-content\">\r\n          <h3 class=\"table-header\">Table: {{ output.table }}</h3>      \r\n          <table>\r\n            <thead>\r\n              <tr>\r\n                <th>Column</th>\r\n                <th>Type</th>\r\n                <th>Primary</th>\r\n                <th>Unique</th>\r\n              </tr>\r\n            </thead>\r\n            <tbody>\r\n              @for (c of output.columns; track c.name) {\r\n                  <tr>\r\n                    <td>{{ c.name }}</td>\r\n                    <td>{{ c.type }}</td>\r\n\r\n                    @if (c.primary) {\r\n                      <td>{{ c.primary }}</td>\r\n                    } @else {\r\n                      <td>_</td>\r\n                    }  \r\n                                        \r\n                    @if (c.unique) {\r\n                      <td>{{ c.unique }}</td>\r\n                    } @else {\r\n                      @if (c.primary) {\r\n                        <td>{{ c.primary }}</td>\r\n                      } @else {\r\n                        <td>_</td>\r\n                      }\r\n                    }\r\n                  </tr>\r\n              }            \r\n            </tbody>\r\n          </table>\r\n      </div>      \r\n  }\r\n  \r\n  @if (output?.type === 'TABLE_DATA') {\r\n      <div>\r\n          <h3 class=\"table-header\">Table: <span class=\"header-descr\">{{ output.table }}</span></h3>\r\n          @if (output.rows.length) {\r\n              <table>\r\n                  <thead>\r\n                    <tr>\r\n                      @for (key of output.rows[0] | keyvalue; track key) {\r\n                          <th>\r\n                              {{ key.key }}\r\n                          </th>\r\n                      }                    \r\n                    </tr>\r\n                  </thead>            \r\n                  <tbody>\r\n                      @for (row of output.rows; track row) {\r\n                          <tr>\r\n                              @for (cell of row | keyvalue; track cell) {\r\n                                  <td>\r\n                                      {{ cell.value }}\r\n                                  </td>\r\n                              }                            \r\n                          </tr>\r\n                      }                  \r\n                  </tbody>\r\n              </table>\r\n          }\r\n          @if (!output.rows.length) {\r\n              <p>Table is empty</p>\r\n          }        \r\n      </div>      \r\n  }\r\n  \r\n  @if (output?.error) {\r\n      <div class=\"error\">\r\n          {{ output.error }}\r\n      </div>\r\n  }    \r\n\r\n  @if (showHistory) {\r\n      <div class=\"history\">\r\n        <h3  class=\"table-header\">Query History</h3>\r\n    \r\n        @if (history.length) {\r\n          <ul>\r\n            @for (q of history; track q) {\r\n              <li>\r\n                <button type=\"button\" (click)=\"loadFromHistory(q)\">\r\n                  {{ q }}\r\n                </button>\r\n              </li>\r\n            }\r\n          </ul>\r\n        }\r\n      </div>\r\n    }\r\n</div>", styles: [":host{font-family:var(--terminal-font);background:#66ff6640;padding:.5rem;border-radius:10px;color:var(--terminal-text-primary);display:block;min-height:100vh}::selection{background-color:var(--terminal-text-soft);color:var(--terminal-bg)}::-moz-selection{background-color:var(--terminal-text-soft);color:var(--terminal-bg)}.logo-text{color:var(--terminal-text-bright);font-style:italic}.json-tree-header{margin-left:2rem}.table-header{margin-left:1rem}.header-descr{color:var(--terminal-text-soft)}.sql-console,.sql-output{font-family:Courier New,monospace;background:#010701fc;color:#0f8}.sql-console{margin-top:.1rem;padding:.5rem;width:inherit;display:block;justify-items:center;border:1px solid rgba(102,255,102,.95);border-radius:10px}.hint{font-size:.7rem;text-align:center}.sql-console h2,.hint span{color:var(--terminal-text-soft);text-align:center;border:1px solid rgba(0,255,136,.25);border-radius:7px;background:var(--terminal-panel);box-shadow:inset;padding:.5rem}.hint span{padding:.2rem;margin-left:.3rem;border:1px solid rgba(0,255,136,.15);color:var(--terminal-text-primary)}.sql-console h2{font-size:1.2rem;text-decoration:underline}.hint code{color:#88ee85}.console-textarea{width:100%;display:flex;justify-content:center}.console-textarea textarea{border:1px solid rgba(0,255,136,.35);border-radius:.5rem;padding:.5rem;margin:1.5rem 1rem 1rem;width:90%}.console-btns{border:1px solid rgba(0,255,136,.35);border-radius:.2rem;display:flex;margin:1rem auto;padding:.5rem 0;justify-content:center;background:var(--terminal-panel)}.console-btns button{margin:0 1rem;padding:.25rem;border-radius:7px;color:#023a20d9;font-weight:700;font-size:.75rem;cursor:pointer}.console-btns button:hover{color:#00ff88d9;background-color:#022717d9;border:1px solid rgba(0,255,136,.65)}.sql-output table{width:100%;border-collapse:collapse;margin-top:20px;background:#000;border:1px solid #003322;box-shadow:0 0 12px #00ff8826}thead{background:#001a11}th{padding:10px 14px;text-align:left;font-weight:600;color:#0fa;border-bottom:1px solid #004422;text-shadow:0 0 4px #00ff88}td{padding:10px 14px;border-bottom:1px solid #002211;color:#6f6}tbody tr:hover{background:#001a11}.sql-output p{padding:20px;color:#042}.error{margin-top:20px;padding:12px;background:#200;border:1px solid #660000;color:#f44;font-weight:700;text-shadow:0 0 6px red}.json-tree{margin-top:20px;padding:16px;background:#000;border:1px solid #003322;box-shadow:inset 0 0 15px #00ff8814}.history{border-top:1px solid rgba(255,0,0,.75);padding:1rem}.history ul{list-style:none;padding:0}.history button{background:none;border:none;border-bottom:1px solid #004422;cursor:pointer;text-align:left;padding:4px 0;color:var(--terminal-text-soft);font-family:Courier New,Courier,monospace}.sql-output{border:2px solid #00ffaa;margin-top:2rem;background:#010701f2;border-radius:7px}.console-input{background:#000;color:#0f8;border:1px solid #003322;padding:12px;font-family:Courier New,monospace;caret-color:#0f8}.console-input:focus{outline:none;box-shadow:0 0 10px #0f8}\n"] }]
        }], ctorParameters: () => [{ type: SqlEngineService }], propDecorators: { sqlInput: [{
                type: ViewChild,
                args: ['sqlInput']
            }], onKeyDown: [{
                type: HostListener,
                args: ['window:keydown', ['$event']]
            }] } });

class FrontSql {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: FrontSql, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "20.3.16", type: FrontSql, isStandalone: true, selector: "lib-front-sql", ngImport: i0, template: `
  <div class="main">
   <div class="content">
     <app-sql-console />
   </div>
  </div>
  `, isInline: true, styles: [":root{--terminal-bg: #000000;--terminal-panel: #001a11;--terminal-border: #003322;--terminal-text-primary: #00ff88;--terminal-text-bright: #00ffaa;--terminal-text-dim: #004422;--terminal-text-soft: #66ff66;--terminal-error-bg: #220000;--terminal-error-border: #660000;--terminal-error-text: #ff4444;--terminal-glow-soft: 0 0 6px rgba(0, 255, 136, .4);--terminal-glow-strong: 0 0 12px rgba(0, 255, 136, .7);--terminal-font: \"Courier New\", monospace}.main{width:90%;min-height:100%;display:flex;justify-content:center;align-items:center;padding:1rem;box-sizing:inherit;position:relative}.content{display:flex;justify-content:space-around;max-width:98%;margin-bottom:3rem}@media screen and (max-width: 650px){.content{flex-direction:column;width:max-content}}\n"], dependencies: [{ kind: "component", type: SqlConsoleComponent, selector: "app-sql-console" }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: FrontSql, decorators: [{
            type: Component,
            args: [{ selector: 'lib-front-sql', imports: [SqlConsoleComponent], template: `
  <div class="main">
   <div class="content">
     <app-sql-console />
   </div>
  </div>
  `, styles: [":root{--terminal-bg: #000000;--terminal-panel: #001a11;--terminal-border: #003322;--terminal-text-primary: #00ff88;--terminal-text-bright: #00ffaa;--terminal-text-dim: #004422;--terminal-text-soft: #66ff66;--terminal-error-bg: #220000;--terminal-error-border: #660000;--terminal-error-text: #ff4444;--terminal-glow-soft: 0 0 6px rgba(0, 255, 136, .4);--terminal-glow-strong: 0 0 12px rgba(0, 255, 136, .7);--terminal-font: \"Courier New\", monospace}.main{width:90%;min-height:100%;display:flex;justify-content:center;align-items:center;padding:1rem;box-sizing:inherit;position:relative}.content{display:flex;justify-content:space-around;max-width:98%;margin-bottom:3rem}@media screen and (max-width: 650px){.content{flex-direction:column;width:max-content}}\n"] }]
        }] });

/*
 * Public API Surface of front-sql
 * https://benkatiku.netlify.app
 * https://frontsql.netlify.app
 */
// SQL Engine

/**
 * Generated bundle index. Do not edit.
 */

export { DatabaseService, FrontSql, IndexedDbService, SqlEngineService };
//# sourceMappingURL=front-sql.mjs.map
