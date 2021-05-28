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

export const checkEthTxStatus = async (txHash, web3) => {
    console.log({checking: txHash})
    try{
        let response =  await web3.eth.getTransactionReceipt(txHash)
        console.log(response)
        return response
    } catch (e) {}
    return false
}

export const checkEthTransactionUntilResult = async (txHash, web3, resolver) => {
    let txHashInfo = await checkEthTxStatus(txHash, web3)
    if (!txHashInfo || !txHashInfo.status) setTimeout(() => checkEthTransactionUntilResult(txHash, web3, resolver), 5000)
    else resolver(txHashInfo)
}