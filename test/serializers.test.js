'use strict'
const { test } = require('tap')
const { sink } = require('./helper')
const pino = require('../')

const parentSerializers = {
  test: () => 'parent'
}

const childSerializers = {
  test: () => 'child'
}

test('serializers override values', async ({is}) => {
  const parent = pino({ serializers: parentSerializers }, sink(function (o, enc) {
    is(o.test, 'parent')
  }))
  parent.child({ serializers: childSerializers })

  parent.fatal({test: 'test'})
})

test('child does not overwrite parent serializers', async ({is}) => {
  var c = 0
  const parent = pino({ serializers: parentSerializers }, sink(function (o, enc, cb) {
    c++
    if (c === 1) is(o.test, 'parent')
    if (c === 2) {
      is(o.test, 'child')
    }
    cb()
  }))
  const child = parent.child({ serializers: childSerializers })

  parent.fatal({test: 'test'})
  child.fatal({test: 'test'})
})

test('children inherit parent serializers', async ({is}) => {
  const parent = pino({ serializers: parentSerializers }, sink(function (o, enc) {
    is(o.test, 'parent')
  }))

  const child = parent.child({a: 'property'})
  child.fatal({test: 'test'})
})

test('children serializers get called', async ({is}) => {
  const parent = pino({
    test: 'this'
  }, sink(function (o, enc) {
    is(o.test, 'child')
  }))

  const child = parent.child({ 'a': 'property', serializers: childSerializers })

  child.fatal({test: 'test'})
})

test('children serializers get called when inherited from parent', async ({is}) => {
  const parent = pino({
    test: 'this',
    serializers: parentSerializers
  }, sink(function (o, enc) {
    is(o.test, 'pass')
  }))

  const child = parent.child({serializers: {test: function () { return 'pass' }}})

  child.fatal({test: 'fail'})
})

test('non-overridden serializers are available in the children', async ({is}) => {
  const pSerializers = {
    onlyParent: function () { return 'parent' },
    shared: function () { return 'parent' }
  }

  const cSerializers = {
    shared: function () { return 'child' },
    onlyChild: function () { return 'child' }
  }

  var c = 0

  const parent = pino({ serializers: pSerializers }, sink(function (o, enc, cb) {
    c++
    if (c === 1) is(o.shared, 'child')
    if (c === 2) is(o.onlyParent, 'parent')
    if (c === 3) is(o.onlyChild, 'child')
    if (c === 4) {
      is(o.onlyChild, 'test')
    }
    cb()
  }))

  const child = parent.child({ serializers: cSerializers })

  child.fatal({shared: 'test'})
  child.fatal({onlyParent: 'test'})
  child.fatal({onlyChild: 'test'})
  parent.fatal({onlyChild: 'test'})
})

test('Symbol.for(\'pino.*\') serializer', async ({notSame, is, isNot}) => {
  const globalSerializer = {
    [Symbol.for('pino.*')]: function (obj) {
      if (obj.lionel === 'richie') {
        return {hello: 'is', it: 'me', you: 'are', looking: 'for'}
      }
      return {lionel: 'richie'}
    }
  }
  var c = 0
  const logger = pino({serializers: globalSerializer}, sink(function (o, enc, cb) {
    c++
    if (c === 1) {
      is(o.lionel, 'richie')
      isNot(o.hello, 'is')
      isNot(o.it, 'me')
      isNot(o.you, 'are')
      isNot(o.looking, 'for')
    }
    if (c === 2) {
      is(o.lionel, 'richie')
      is(o.hello, 'is')
      is(o.it, 'me')
      is(o.you, 'are')
      is(o.looking, 'for')
    }
    if (c === 3) {
      is(o.lionel, 'richie')
      is('pid' in o, false)
      is('hostname' in o, false)
      notSame(o, ['pid', 'hostname'])
    }
    cb()
  }))

  logger.info({hello: 'is', it: 'me', you: 'are', looking: 'for'})
  logger.info({lionel: 'richie'})
  logger.info('message')
})
