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
    //console.log({checking: txHash})
    try{
        let response =  await web3.eth.getTransactionReceipt(txHash)
        //console.log(response)
        return response
    } catch (e) {}
    return false
}

export const checkEthTransactionUntilResult = async (txHash, web3, resolver) => {
    let txHashInfo = await checkEthTxStatus(txHash, web3)
    if (!txHashInfo || !txHashInfo.status) setTimeout(() => checkEthTransactionUntilResult(txHash, web3, resolver), 5000)
    else resolver(txHashInfo)
}

export const checkERC20ApprovalAmount = async (approvalFrom, approvalTo, ERC20_Contract) => {
    return new Promise(resolver => {
        try{
            ERC20_Contract.methods.allowance(approvalFrom, approvalTo).call()
            .then(allowance => resolver(allowance))
        }catch (err) {
            resolver("0")
        }
    })
}

export const needsERC20Approval = async (approvalFrom, approvalTo, ERC20_Contract, quantity_wei, web3) => {
    var BN = web3.utils.BN
    let allowance = await checkERC20ApprovalAmount(approvalFrom, approvalTo, ERC20_Contract)
    let allowanceBN = new BN(allowance)
    let quantity_wei_BN = new BN(quantity_wei)
    //console.log({approvalFrom, approvalTo, quantity_wei, allowance})
    return allowanceBN.gte(quantity_wei_BN)
}