import Vue from 'vue'
import { reaction, observable, runInAction, action, computed } from 'mobx'
import Movue, { mapFields, mapMethods } from '../src'

const nextTick = Vue.nextTick

test('install well', () => {
  Vue.use(Movue)
})

test('bind mobx store to render', done => {
  const data = observable({
    foo: 1,
    bar: 2,
    get foobar() {
      return this.foo + this.bar
    }
  })

  Vue.use(Movue)

  const vm = new Vue({
    store: data,
    $mapState: {
      getterFoo: {
        get() {
          return data.foo
        }
      },
      foo() {
        return data.foo
      },
      foobarPlus() {
        return data.foobar + 1
      }
    },
    render (h) {
      const vm: any = this
      return h('div', `${vm.getterFoo}|${vm.foo}|${vm.foobarPlus}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('1|1|4')

  runInAction(() => {
    data.foo++
  })

  nextTick(() => {
    expect(vm.$el.textContent).toBe('2|2|5')
    done()
  })
})

test(`can use this.data in fromMobx`, done => {
  const data = observable({
    foo: 1,
    get fooPlus() {
      return this.foo + 1
    }
  })
  
  Vue.use(Movue, data)

  const vm = new Vue({
    data() {
      return {
        bar: 2
      }
    },
    computed: {
      barPlus() {
        return this.bar + 1
      }
    },
    $mapState: {
      foobar() {
        return data.foo + this.bar
      },
      foobarPlus() {
        return data.fooPlus + this.barPlus
      }
    },
    render (h) {
      const vm: any = this
      return h('div', `${vm.foobar}|${vm.foobarPlus}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('3|5')

  vm.bar++
  runInAction(() => {
    data.foo++
  })

  nextTick(() => {
    expect(vm.$el.textContent).toBe('5|7')
    done()
  })
})

test(`can set field to store`, done => {
  const data = observable({
    foo: 1,
    get fooPlus() {
      return this.foo + 1
    },
    setFoo(value) {
      this.foo = value
    }
  })

  Vue.use(Movue, data)

  const vm = new Vue({
    data() {
      return {
        bar: 2
      }
    },
    computed: {
      barPlus() {
        return this.bar + 1
      }
    },
    $mapState: {
      foobar: {
        get() {
          return data.foo + this.bar
        },
        set(value) {
          data.setFoo(value - this.bar)
        }
      },
      foobarPlus() {
        return data.fooPlus + this.barPlus
      }
    },
    render (h) {
      const vm: any = this
      return h('div', `${vm.foobar}|${vm.foobarPlus}`)
    }
  }).$mount()

  vm.foobar++

  nextTick(() => {
    expect(vm.$el.textContent).toBe('4|6')
    expect(data.foo).toBe(2)
    done()
  })
})


test(`fields in fromMobx can be used in watch & computed`, done => {

  const data = observable({
    foo: 1
  })

  Vue.use(Movue, data)

  const onFooChange = jest.fn()
  const onFoobarChange = jest.fn()

  const vm = new Vue({
    data() {
      return {
        bar: 2
      }
    },
    computed: {
      foobar() {
        return this.foo + this.bar
      }
    },
    $mapState: {
      foo() {
        return data.foo
      }
    },
    watch: {
      foo(value) {
        onFooChange(value)
      },
      foobar(value) {
        onFoobarChange(value)
      }
    },
    render (h) {
      const vm: any = this
      return h('div', `${vm.foobar}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('3')

  vm.bar++
  runInAction(() => {
    data.foo++
  })

  nextTick(() => {
    expect(vm.$el.textContent).toBe('5')
    expect(onFooChange.mock.calls).toHaveLength(1)
    expect(onFooChange.mock.calls[0][0]).toBe(2)
    expect(onFoobarChange.mock.calls).toHaveLength(1)
    expect(onFoobarChange.mock.calls[0][0]).toBe(5)
    done()
  })
})

class Counter {
  @observable num = 0
  @computed get numPlus() {
    return this.num + 1
  }
  @action setNum(value) {
    this.num = value
  }
  @action plus() {
    this.setNum(this.num + 1)
  }
  @action reset() {
    this.setNum(0)
  }
}

test('helper mapFields', () => {
  const counter = new Counter()
  Vue.use(Movue, counter)

  const vm = new Vue({
    $mapState: {
      ...mapFields(counter, ['num', 'numPlus'])
    },
    render (h) {
      const vm: any = this
      return h('div', `${vm.num}|${vm.numPlus}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('0|1')
})

test('helper mapFields with alias', () => {
  const counter = new Counter()
  Vue.use(Movue, counter)


  const vm = new Vue({
    $mapState: {
      ...mapFields(counter, {
        myNum: 'num',
        myNumPlustOne: 'numPlus'
      })
    },
    render (h) {
      const vm: any = this
      return h('div', `${vm.myNum}|${vm.myNumPlustOne}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('0|1')
})

test('helper mapFields can work object notation', () => {
  const counter = new Counter()
  Vue.use(Movue, counter)


  const vm = new Vue({
    $mapState: {
      ...mapFields(counter, {
        myNum: { get: 'num', set: 'setNum' },
        myNumPlustOne: { get: 'numPlus' }
      })
    },
    render (h) {
      const vm: any = this
      return h('div', `${vm.myNum}|${vm.myNumPlustOne}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('0|1')
})

test('helper mapFields can work with setter', done => {
  const counter = new Counter()
  Vue.use(Movue)


  const vm = new Vue({
    store: counter,
    $mapState: {
      myNum: { get: 'num', set: 'setNum' },
      myNumPlustOne: { get: 'numPlus', set(value, store) { store.setNum(value - 1) } }
    },
    render (h) {
      const vm: any = this
      return h('div', `${vm.myNum}|${vm.myNumPlustOne}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('0|1')

  vm.myNum++
  nextTick(() => {
    expect(vm.$el.textContent).toBe('1|2')
    vm.myNumPlustOne = 10
    nextTick(() => {
      expect(vm.$el.textContent).toBe('9|10')
      done()
    })
  })
})

test('helper mapFields can work with this.data in complex getter and setter', done => {
  const counter = new Counter()
  Vue.use(Movue)


  const vm = new Vue({
    store: counter,
    data() {
      return {
        a: 2
      }
    },
    $mapState: {
      myNum: { get: 'num' },
      myNumPlusA: {
        get(store) { return store.num + this.a; },
        set(value, store) { store.setNum(value - this.a) }
      },
      myNumPlustOne: {
        get: 'numPlus',
        set(value, store) { store.setNum(value - 1) }
      }
    },
    render (h) {
      const vm: any = this
      return h('div', `${vm.myNum}|${vm.myNumPlusA}|${vm.myNumPlustOne}`)
    }
  }).$mount()

  expect(vm.$el.textContent).toBe('0|2|1')

  vm.myNumPlusA++
  nextTick(() => {
    expect(vm.$el.textContent).toBe('1|3|2')

    vm.myNumPlusA = 10
    nextTick(() => {
      expect(vm.$el.textContent).toBe('8|10|9')
      done()
    })
  })
})

test('helper mapMethods', () => {
  const counter = new Counter()
  Vue.use(Movue, counter)


  const vm = new Vue({
    methods: {
      ...mapMethods(counter, ['plus', 'reset'])
    },
    render (h) {
      const vm: any = this
      return h('div', `${vm.num}|${vm.numPlus}`)
    }
  }).$mount()

  expect(counter.num).toBe(0)

  vm.plus()
  expect(counter.num).toBe(1)

  vm.plus()
  expect(counter.num).toBe(2)

  vm.reset()
  expect(counter.num).toBe(0)
})

test('helper mapMethods with alias', () => {
  const counter = new Counter()

  Vue.use(Movue, counter)

  const vm = new Vue({
    methods: {
      ...mapMethods(counter, {
        myPlus: 'plus',
        myReset: 'reset'
      })
    },
    render (h) {
      const vm: any = this
      return h('div', `${vm.num}|${vm.numPlus}`)
    }
  }).$mount()

  expect(counter.num).toBe(0)

  vm.myPlus()
  expect(counter.num).toBe(1)

  vm.myPlus()
  expect(counter.num).toBe(2)

  vm.myReset()
  expect(counter.num).toBe(0)
})

test('clean watchers before destroy', () => {
  const data = observable({
    foo: 1
  })

  Vue.use(Movue, data)

  const vm = new Vue({
    $mapState: {
      foo() {
        return data.foo
      }
    },
    render (h) {
      const vm: any = this
      return h('div', vm.foo + '')
    }
  }).$mount()

  vm.$destroy()
})

test('normal components destroy well', () => {
  const vm = new Vue({
    data() {
      return { foo: 1 }
    },
    render (h) {
      const vm: any = this
      return h('div', vm.foo + '')
    }
  }).$mount()

  vm.$destroy()
})

test('fromMobx attributes pulled from mixin', () => {
  const data = observable({
    foo: 1
  })

  Vue.use(Movue, data)
  
  const mixin = {
    $mapState: {
      foo () {
        return data.foo
      }
    }
  }

  const vm = new Vue({
    mixins: [mixin],
    computed: {
      value () {
        return this.foo
      }
    },
    render (h) {
      const vm: any = this
      return h('div', `${vm.value}`)
    }
  }).$mount()

  expect(vm.foo).toBe(1)

  vm.$destroy()
})

test('fromMobx attributes pulled from mixins', () => {

  const data = observable({
    foo: 1
  })

  Vue.use(Movue, data)

  const mixin1 = {
    $mapState: {
      foo () {
        return data.foo
      },
      fooPlus () {
        return data.foo
      }
    }
  }

  const mixin2 = {
    $mapState: {
      fooPlus () {
        return data.foo + 1
      },
      fooPlusPlus () {
        return data.foo + 2
      }
    }
  }

  const vm = new Vue({
    store: data,
    mixins: [mixin1, mixin2],
    render (h) {
      const vm: any = this
      return h('div', `${vm.value}|${vm.fooPlus}`)
    }
  }).$mount()

  expect(vm.foo).toBe(1)
  expect(vm.fooPlus).toBe(2)
  expect(vm.fooPlusPlus).toBe(3)

  vm.$destroy()
})
