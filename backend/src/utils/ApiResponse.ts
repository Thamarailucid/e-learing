export interface IPaginationMetadata {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: IPaginationMetadata;
}

export class ApiResponse {
  static success<T>(message: string, data?: T, pagination?: IPaginationMetadata): IApiResponse<T> {
    const response: IApiResponse<T> = {
      success: true,
      message,
    };
    if (data !== undefined) {
      response.data = data;
    }
    if (pagination !== undefined) {
      response.pagination = pagination;
    }
    return response;
  }
}
