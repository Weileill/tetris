import React, { useEffect, useRef } from 'react'


export default function BoardCanvas({ board, blockSize = 24, width = 10, height = 20 }){
const ref = useRef(null)


useEffect(() => {
const canvas = ref.current
const ctx = canvas.getContext('2d')
canvas.width = width * blockSize
canvas.height = height * blockSize


ctx.clearRect(0,0,canvas.width, canvas.height)
// draw board
board.forEach((row,y) => {
row.forEach((cell,x) => {
if(cell){
ctx.fillStyle = cell
ctx.fillRect(x*blockSize, y*blockSize, blockSize-1, blockSize-1)
} else {
// subtle grid
ctx.strokeStyle = 'rgba(255,255,255,0.02)'
ctx.strokeRect(x*blockSize, y*blockSize, blockSize, blockSize)
}
})
})
}, [board, blockSize, width, height])


return <canvas ref={ref} style={{display:'block'}} />
}