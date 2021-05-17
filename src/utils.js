export const getErrorInfo = (txResults) => {
    if (txResults){
        if (txResults.data){
            if (txResults.data.resultInfo){
                if (txResults.data.resultInfo.errorInfo){
                    return txResults.data.resultInfo.errorInfo[0]
                }
            }
        }
    }
    return "Transaction returned an unknown error."
}

export const getCurrentNetwork = () => {
    if (typeof window === "undefined") return
    let network = localStorage.getItem("current_network")
    if (!network) {
        network = "mainnet"
        setCurrentNetwork(network)
    }
    return network
}

export const setCurrentNetwork = (network) => {
    localStorage.setItem("current_network", network)
}