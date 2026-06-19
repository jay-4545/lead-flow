import { NextResponse } from "next/server"

export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiError(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status })
}
