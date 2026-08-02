export type Addr2PostalCodeRow = {
    postalCode: number;
    address: string;
};

export type SearchResult = {
    postalCode: number | undefined;
    addressCandidate: string;
    matchRange: [number, number];
};

export const toStringPostalCodeAndAddr = (postalCode: number | undefined, address: string): string => {
    const head = postalCode !== undefined ? String(postalCode).padStart(7, "0") : "-------";
    return `${head}: ${address}`;
};
