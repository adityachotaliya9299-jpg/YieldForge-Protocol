import { useReadContracts } from "wagmi";

const ORACLE_ADDR = (process.env.NEXT_PUBLIC_ORACLE ?? "0x") as `0x${string}`;

const ORACLE_ABI = [
  { name:"getStkPrice", type:"function", stateMutability:"view", inputs:[], outputs:[{name:"price",type:"int256"},{name:"decimals_",type:"uint8"}] },
  { name:"getRwdPrice", type:"function", stateMutability:"view", inputs:[], outputs:[{name:"price",type:"int256"},{name:"decimals_",type:"uint8"}] },
  { name:"getEthPrice", type:"function", stateMutability:"view", inputs:[], outputs:[{name:"price",type:"int256"},{name:"decimals_",type:"uint8"}] },
] as const;

const FALLBACK = { stkPrice:0.024, rwdPrice:0.01, ethPrice:3000 };

export function useTokenPrice() {
  const { data } = useReadContracts({
    contracts: [
      { address:ORACLE_ADDR, abi:ORACLE_ABI, functionName:"getStkPrice" },
      { address:ORACLE_ADDR, abi:ORACLE_ABI, functionName:"getRwdPrice" },
      { address:ORACLE_ADDR, abi:ORACLE_ABI, functionName:"getEthPrice" },
    ],
    query: {
      refetchInterval: 30_000, // refresh every 30s
      enabled: ORACLE_ADDR !== "0x",
    },
  });

  const parsePrice = (result: readonly [bigint, number] | undefined, fallback: number): number => {
    if (!result) return fallback;
    const [price, decimals] = result;
    if (!price || price <= 0n) return fallback;
    return Number(price) / 10 ** decimals;
  };

  const stkPrice = parsePrice(data?.[0]?.result as readonly [bigint,number] | undefined, FALLBACK.stkPrice);
  const rwdPrice = parsePrice(data?.[1]?.result as readonly [bigint,number] | undefined, FALLBACK.rwdPrice);
  const ethPrice = parsePrice(data?.[2]?.result as readonly [bigint,number] | undefined, FALLBACK.ethPrice);

  const toUSD = (amount: number | string, token: "STK" | "RWD" | "ETH") => {
    const n = Number(amount);
    if (isNaN(n)) return 0;
    switch (token) {
      case "STK": return n * stkPrice;
      case "RWD": return n * rwdPrice;
      case "ETH": return n * ethPrice;
    }
  };

  const formatUSD = (amount: number | string, token: "STK" | "RWD" | "ETH") => {
    const usd = toUSD(amount, token);
    if (usd >= 1_000_000) return `$${(usd/1_000_000).toFixed(2)}M`;
    if (usd >= 1_000)     return `$${(usd/1_000).toFixed(2)}K`;
    return `$${usd.toFixed(2)}`;
  };

  const isLive = ORACLE_ADDR !== "0x" && !!data?.[0]?.result;

  return { stkPrice, rwdPrice, ethPrice, toUSD, formatUSD, isLive };
}