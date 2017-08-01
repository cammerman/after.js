# What Is It?
After.js is an implementation of [Promises/A+](https://github.com/promises-aplus/promises-spec) for JavaScript.

Oversimplified, a "promise" is an object that a function can return when it needs to say "I will try to produce a result for you, and if I can't, I'll tell you why. Either way, it's not ready at this moment. How should I contact you when it is?".

The practical result of this is that when you receive or produce a promise, you can chain subsequent operations after it, promise-producing or otherwise. They will all be executed asynchronously, and in the proper order, without nesting callbacks. And all this can be accomplished using code that reads from top to bottom in the order that it will be executed. At least as much so as any completely synchronous code does. :smile:

# How Does It Work?

*All code samples in this section will assume the After.js namespace object has been assigned to a variable called ```After```.*

## Referencing

The ```after.js``` file can be used as is either in a browser environment, or in node.js, with some very minor caveats.

After.js is creates only a single runtime artifact--a namespace object--and it attempts to automatically determine where that object should go.

If there is a global ```exports``` variable defined, After.js will assume it is being loaded in a node.js environment, and all members of the After.js namespace will be attached to the exported module.

If there is no global ```exports``` variable defined, but there is a global ```define``` function defined, After.js will assume it is being loaded in a browser environment with Asynchronous Module Definition (AMD) support in place. In this case, the module result is the namespace object.

If there is neither a global ```exports``` variable nor a global ```define``` variable defined, then After.js will assume it is being loaded synchronously in a browser environment. The namespace will be assigned to the global context as ```After```.

## Creating a Pending Promise

The most basic use case producing a promise is to create a promise that can later be fulfilled or rejected, and which can be handed back to a caller in a form which cannot be tampered with.

This can be done in just a couple of steps. First call the ```pending``` function to produce a "pending" object. This object has three properties on it:

1. ```fulfill``` - a function taking a value with which to fulfill the promise
2. ```reject``` - a function taking a reason with which to reject the promise
3. ```promise``` - the safe promise object itself that can be returned to the caller

Once you have the pending object, you can send that through your async operations for later resolution, and return the value of the ```promise``` object for the caller to make use of.

```javascript
function myAsyncOp () {
    var pending = After.pending();

    /* ...set up some async work that will resolve the promise... */

    return pending.promise;
}
```

## Resolving a Pending Promise

Once a promise has been created, it must eventually be resolved, or else the caller that depends on the promise will end up stuck with a hung process or browser tab.

If the operation represented by the promise succeeds, you will want to "fulfill" the promise. This is accomplished by calling the ```fulfill``` function on the "pending" object, passing in the fulfillment value.

If the operation represented by the promise fails, you may want to "reject" the promise. Do this by calling the ```reject``` function on the "pending" object, passing in the reason value. As with fulfillment, this can be literally any value you like..

```javascript
function myAsyncOp() {
    var pending = After.pending();

    sendAjaxRequest({
        async: true,
        done: function ajaxDone(response) {
            pending.fulfill(response);
        },
        error: function ajaxError(err) {
            pending.reject(err.message);
        }
    });

    return pending.promise;
}
```

## Consuming a Promise

As the caller, once you have a promise, you can use it to define what should happen once the promise's operation succeeds or fails. Do this by calling the ```then``` function on the promise itself. This function takes two parameters, ```onFulfillment``` and ```onRejection```, which are callback functions which will be called when the promise is fulfilled or rejected, respectively.

```javascript
var promise = myAsyncOp();

promise.then(
    function asyncOpSucceeded(value) {
        console.log('Succeeded with value ' + value.toString());
    }, function asyncOpFailed(reason) {
        console.log('Failed with reason ' + reason.toString());
    });

console.log('Waiting for promise');
```

The code above, if the operation succeeds yielding a value of ```5```, will produce the following output.

```text
Waiting for promise
Succeeded with value 5
```

If the operation fails with a reason of ```404 not found```, it will produce the following output.

```text
Waiting for promise
Failed with reason 404 not found
```

Notice that the message ```Waiting for promise``` was output first. This will be true *even if the promise operation was completed synchronously*. The Promises/A+ spec mandates that the fulfillment or rejection callbacks will not be called on the same JavaScript event loop iteration in which the ```then``` call was made.

## Resolution Chaining

One of the most useful properties of promises is that their resolution is chainable. This allows an API that produces promises to support an arbitrarily long, strictly ordered, asynchronously executed series of operations to be triggered at the completion of its promise-producing operations, with little or no need for nested callbacks. In fact, this is achieved without the operations in the series needing to be aware of each other at all.

What's more, these operations can choose to pass on a different fulfillment value or reason to the next function in line. This provides a very concise mechanism for implementing a pipeline pattern, or building isolation layers around a low-level asynchronous operation.

Below is an example of promise chaining. It is contrived because all the links are defined in-place. But it is easy to read, and illustrates the simplifying power of promises. Note that there is no nesting of dependent callbacks or pipelined functions. All the chained steps are defined at the same nesting level, and in the order in which they will actually occur, regardless of synchrony (or lack thereof).

```javascript
var promise1 = myAsyncOp().then(
    function opSuccess(value) {
        return value + 1;
    }, function opFailure(reason) {
        return 'Op failed with reason: "' + reason.toString() + '"';
    }
).then(
    function op2Success(value) {
        return value + 1;
    }, function op2Failure(reason) {
        return 'Op2 failed with message: "' + reason.toString() + '"';
    }
).then(
    function op3Success(value) {
        console.log('Success! Result: ' + value.toString());
    }, function op3Failure(reason) {
        console.log('Op3 failed with message: "' + reason.toString() + '"');
    }
);

console.log('Waiting...');
```

If the original operation succeeds with the value ```5```, the console will show the following.

```text
Waiting...
Success! Result: 7
```

If the original operation fails with a reason of ```500 internal server error```, the console will show the following.

```text
Waiting...
Op3 failed with message: "Op2 failed with message: "Op failed with reason: "500 internal server error"""
```

## Continuation Promises

Arguably one of the most powerful things to do with promises is to "nest" them. At the completion of one promise, the remaining dependency chain can be swapped over to hang off of another promise. This provides a way of assembling recursive promises, without any of the strange code gyrations you would typically see with recursion. Promises are a way of cleanly creating "continuation semantics" with asynchronous operations, without your code having to keep passing around callbacks explicitly. "Continuation promises" are simply a way of chaining your asynchronous operations internally, passing the promise down the line until the final operation is ready to resolve it.

The example for this is the most complicated piece of code you'll see in this documentation, and even so, it's pretty straightforward. In order to pass the fulfillment responsibilities of one promise on to another, you don't return the original promise. You register your own then handlers, and return the second-order promise that creates. Then in your fulfillment (or rejection) handler, instead of returning a value, you return a promise for the second asynchronous operation. The After.js infrastructure will take care of hooking up the handlers so that the outer promise isn't fulfilled till that chained promise is fulfilled. (And likewise with rejection.)

Here is the example.

```javascript
function authorize() {
    var pending = After.pending();

    sendAuthorizationRequest({
        async: true,
        done: function athorizeDone(response) {
            pending.fulfill(response);
        },
        error: function authorizeError(err) {
            pending.reject(err.message);
        }
    });

    return pending.promise;
}

function authenticate() {
    var pending = After.pending();

    sendAuthenticationRequest({
        async: true,
        done: function authenticateDone(response) {
            pending.fulfill(response);
        },
        error: function authenticateError(err) {
            pending.reject(err.message);
        }
    });

    return pending.promise;
}

function logIn() {
    return authenticate().then(
        authorize,
        function authenticateFail(reason) {
            return reason;
        }
    );
}
```

This code arranges two asynchronous operations to happen in sequence, and it does so without actually nesting any callbacks. All it took was saying "authenticate, *then* authorize", and return the promise of that chained set of asynchronous operations back to the outer caller.

This can then be used as below.

```javascript
logIn().then(
    function loggedIn() {
        alert("Welcome to the Matrix.");
    },
    function noAuth(reason) {
        alert("You can't always get what you want. Because " + reason.toString());
    });
```

Here the user will see a success message only if both steps succeed, but they will see a failure message if either the first fails, or if the first succeeds and the second fails. And again, all without a single nested callback!

# How Do I Know It Works?
If you have node.js installed you can execute the [Promises/A+ spec](https://github.com/promises-aplus/promises-spec) by running ```npm test``` at the console in the code folder.
