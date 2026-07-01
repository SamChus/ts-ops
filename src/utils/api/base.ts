

class BaseApi {
    baseUrl: string
    constructor (url:string) {
        this.baseUrl = url
    }
    
    
    
    requestOptions = {
         body: {},
         options: {} as RequestInit,
         args: {}
     }
    
     async request<T> (url:string, args:Record<string, any>, body:Record<string, any>, requestOptions:RequestInit) {
        
     }
}

export default BaseApi