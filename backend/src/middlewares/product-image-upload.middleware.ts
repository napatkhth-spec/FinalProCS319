import multer from 'multer'
import type { RequestHandler } from 'express'
import { HttpError } from '../utils/http-error.js'

const maxImageSize = 5 * 1024 * 1024
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageSize, files: 8, fields: 1, fieldSize: 16 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new HttpError(415, 'รองรับเฉพาะไฟล์ JPG, PNG และ WEBP'))
      return
    }
    callback(null, true)
  },
}).array('images', 8)

export const parseProductImages: RequestHandler = (request, response, next) => {
  parser(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, 'รูปภาพต้องมีขนาดไม่เกิน 5 MB ต่อไฟล์'))
      return next(new HttpError(400, 'ข้อมูลรูปภาพไม่ถูกต้อง'))
    }
    next(error)
  })
}
