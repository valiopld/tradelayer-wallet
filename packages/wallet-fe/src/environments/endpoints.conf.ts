type TEnpoint = {
    [k: string]: {
        orderbookApiUrl: string,
        relayerUrl: string,
    } 
};

export const ENDPOINTS: TEnpoint = {
    LTC: {
        orderbookApiUrl: "http://170.75.174.87:9192",
        relayerUrl: "http://170.75.174.87:9191",
    },
    LTCTEST: {
        orderbookApiUrl: "http://ec2-13-40-194-140.eu-west-2.compute.amazonaws.com:3002",
        relayerUrl: "http://ec2-13-40-194-140.eu-west-2.compute.amazonaws.com:9191",
    },
};
