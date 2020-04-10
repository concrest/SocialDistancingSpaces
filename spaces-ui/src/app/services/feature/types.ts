export interface Index {
  files: string[]
}

export interface ClientOrNetworkError {  
  context: string,
  errorMessage: string
}

export interface ServerSideError {  
  context: string,
  errorMessage: string,  
  statusCode: number
}