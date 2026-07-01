import AppError from "../appError";
import { StatusCodes } from "http-status-codes";

class BaseApi {
  baseUrl: string;

  constructor(url: string) {
    this.baseUrl = url;
  }

  async request<T>(
    url: string,
    options: RequestInit = {},
    args?: Record<string, any>,
  ): Promise<T> {
    try {
      const urlObj = new URL(url, this.baseUrl);

      if (args) {
        urlObj.search = new URLSearchParams(args).toString();
      }

      // Ensure body is typed correctly
      const requestOpt: RequestInit = {
        ...options,
        body: options.body ?? null, // ✅ null is valid for RequestInit.body
      };

      const response = await fetch(urlObj.toString(), requestOpt);

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new AppError(errorMsg, response.status);
      }

      if (response.status === StatusCodes.NO_CONTENT) {
        throw new AppError("No Content Returned", response.status); 
      }

      return response.json() as Promise<T>;
    } catch (err: any) {
      throw new AppError(err.message, 500);
    }
  }

   get<T>(
    url: string,
    args?: Record<string, any>,
    requestInit: RequestInit = {},
  ) {
    return this.request<T>(url, { ...requestInit, method: "GET" }, args);
  }

  post<T>(
    url: string,
    body?: Record<string, any>,
    args?: Record<string, any>,
    requestInit: RequestInit = {},
  ) {
    return this.request<T>(
      url,
      {
        ...requestInit,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(requestInit.headers || {}),
        },
        body: body ? JSON.stringify(body) : null, // ✅ use null instead of undefined
      },
      args,
    );
  }
}

export default BaseApi;
