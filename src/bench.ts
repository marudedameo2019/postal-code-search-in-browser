import { measure } from "./measure.js";
import { type Addr2PostalCodeRow } from './table.js';

export const bench = (data: Addr2PostalCodeRow[], N: number, limit: number, fns: ((search: string, limit: number) => string[])[]): number[] => {
    const keys = Array(N).fill("").map(_ => {
        const rnd = (n:number) => Math.floor(Math.random() * n);
        const address = data[rnd(data.length)].address;
        const idx = rnd(address.length);
        const len = rnd(address.length - idx);
        return address.slice(idx, idx + len);
    });
    let cnt = 0;
    return fns.map(f => {
        const [r,t] = measure(() => keys.map(key => f(key, limit)));
        cnt += r.map(e => e.length).reduce((acc, e) => acc + e, 0);
        return t;
    });
};