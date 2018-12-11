
function hello() {
}

hello.prototype.increment = function(value){
      console.log("calling hellooo");
      value ++;
      return value ;
    };

  function decrement(dec){
    dec --;
    return dec;
  }

  var globle = "this is globle data";

/*var increment = hello(2);
console.log("incremented value is ",increment);*/

 module.exports = hello;