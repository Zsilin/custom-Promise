//自定义Promise1
const PENDING = "pending";
const RESOLVED = "resolved";
const REJECTED = "rejected";

class MyPromise {
  #callbacks = [];
  constructor(excutor) {
    this.status = PENDING;
    this.data = null;
    this._excutor = excutor;
    this._init();
  }

  //执行器函数执行，并传入回调函数
  _init() {
    //如果执行器函数中出错，直接改变promise的状态为rejected
    try {
      this._excutor(this._resolve.bind(this), this._reject.bind(this));
    } catch (error) {
      this._reject(error);
    }
  }

  //传入执行器中的回调函数，改变promise的状态为成功
  //如果此时回调函数存在，则异步执行成功的回调函数(先指定回调再改变状态的情况)
  _resolve(value) {
    if (this.status !== PENDING) return;
    this.status = RESOLVED;
    this.data = value;
    setTimeout(() => {
      for (let { onResolved } of this.#callbacks) {
        onResolved?.(this.data);
      }
    });
  }

  //传入执行器中的回调函数，改变promise的状态为失败
  // 如果此时回调函数存在，则执行失败的回调函数(先指定回调再改变状态的情况)
  _reject(reason) {
    if (this.status !== PENDING) return;
    this.status = REJECTED;
    this.data = reason;
    setTimeout(() => {
      for (let { onRejected } of this.#callbacks) {
        onRejected?.(this.data);
      }
    });
  }

  //指定promise1的成功和失败的回调
  //返回一个promise2，返回promise2的状态由成功或者失败的函数的结果决定
  //如果是promise1状态已经确定，再指定回调函数，则执行对应的回调函数，如果是先指定了回调函数，promise1后改变状态，则需要把回调函数先存储起来。后续状态改变之后进行调用
  then(onResolved, onRejected) {
    const _this = this;
    //为了实现值的传透
    onResolved = typeof onResolved === "function" ? onResolved : value => value;
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : reason => {
            throw reason;
          };

    //then方法返回一个promise2
    return new MyPromise((resolve, reject) => {
      //封装的处理函数，
      function handle(cb) {
        try {
          let res = cb(_this.data);
          if (res instanceof MyPromise) {
            //如果函数返回一个promise3，则promise2的状态由promise3决定
            res.then(resolve, reject);
          } else {
            //如果函数返回值为一个非promise的值，则这个返回的promise的状态为成功，
            resolve(res);
          }
        } catch (error) {
          //如果函数执行报错，则返回失败的promise
          reject(error);
        }
      }

      //如果该 promise1 的状态为成功，则直接执行onResolved函数，并根据结果改变返回的promise2的状态
      if (this.status === RESOLVED) {
        setTimeout(() => {
          handle(onResolved);
        });
      } else if (this.status === REJECTED) {
        //如果该peomise1的状态为失败，则直接执行onRejected函数，并根据结果改变返回的promise2的状态
        setTimeout(() => {
          handle(onRejected);
        });
      } else {
        //如果该promise的状态还是处于pending状态，则把回调函数暂时存储起来，当状态确定之后进行调用
        //为了在调用的时候能够去改变返回promise2的状态，需要封装一层
        this.#callbacks.push({
          onResolved: function () {
            handle(onResolved);
          },
          onRejected: function () {
            handle(onRejected);
          }
        });
      }
    });
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  //直接返回一个成功状态的promise,如果参数是一个promise，则返回的状态根据参数promise来决定
  static resolve(value) {
    return new MyPromise((resolve, reject) => {
      if (value instanceof MyPromise) {
        value.then(resolve, reject);
      } else {
        resolve(value);
      }
    });
  }

  //只接收一个普通的失败的reason
  static reject(reason) {
    return new MyPromise((resolve, reject) => {
      reject(reason);
    });
  }

  //传入一个promise数组，返回一个promise 当所有的promise都完成时，返回promise 的状态才确定
  //promise数组中的所有项都成功时，返回promise状态为成功，返回值为所有的值组成的数组
  //当其中有一个失败的时候，返回promise的状态为失败，返回值为失败的值
  static all(promises) {
    //创建一个数组来存储成功的值
    const arr = new Array(promises.length).fill(undefined);
    return new MyPromise((resolve, reject) => {
      promises.forEach((p, index) => {
        //如果数组中的某一项不是promise，则包装成一个成功状态的promise
        if (!(p instanceof MyPromise)) p = MyPromise.resolve(p);
        p.then(
          value => {
            arr[index] = value;
            !arr.includes(undefined) && resolve(arr);
          },
          reason => {
            reject(reason);
          }
        );
      });
    });
  }

  //传入一个promise数组，返回一个promise，返回promise的状态由最先完成的promise决定
  static race(promises) {
    return new MyPromise((resolve, reject) => {
      for (let p of promises) {
        //如果数组中的某一项不是promise，则包装成一个成功状态的promise
        if (!(p instanceof MyPromise)) p = MyPromise.resolve(p);
        p.then(resolve, reject);
      }
    });
  }
}
