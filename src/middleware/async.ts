

export function asyncMiddleware (handler:Function) {
    return async (req: Request, res: Response, next: Function) => {
       try {
        await handler(req, res)
       } catch (error) {
        next (error)
       }
    }
}