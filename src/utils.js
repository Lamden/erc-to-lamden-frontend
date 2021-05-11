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