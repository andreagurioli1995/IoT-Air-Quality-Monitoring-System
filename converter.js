

origin = "2022-06-08T19:56:19.023778496Z"
time = new Date(origin.toString())
console.log(time)
time.setMilliseconds(time.getMilliseconds() + 1000 * (2 + 1))
console.log(time)
console.log(time.getSeconds())
