function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object"
          ? child
          : createTextElement(child)
      ),
    },
  }
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

const deleteFiber = []

class Fiber{
  constructor(element,parentFiber,nextSibling){
    this.props = element.props
    this.type = element.type
    //dom的来源
    //1.继承自parent fiber alternate状态，对effectTag打上update就行了；
    //2.挂载前生成，对应effectTag 是update的；
    this.dom = null
    //这里保留alternate是为了向下层fiber传递alternate状态
    this.alternate = null
    this.effectTag = null
    this.childrenFiber = []
    this.parentFiber = parentFiber
    this.nextSibling = nextSibling
  }
}
function getNextFiber(fiber){
  if(fiber.childrenFiber.length){
    return fiber.childrenFiber[0]
  }
  if(fiber.nextSibling){
    return fiber.nextSibling
  }
  let _parentFiber = fiber.parentFiber
  while(_parentFiber){
    if(_parentFiber.nextSibling){
      return _parentFiber.nextSibling
    }else{
      _parentFiber = _parentFiber.parentFiber
    }
  }
  return null
}
function generateChildrenFiber(fiber){
  const _childrenFiber = []
  const reducer = (beforeSibling,currentFiber)=>{
    const _currentChild = new Fiber(currentFiber,fiber,beforeSibling)
    _childrenFiber.unshift(_currentChild)
    return _currentChild
  }

  fiber.props.children.reduceRight(reducer,null)
  fiber.childrenFiber = _childrenFiber
}
function createDom(fiber) {
  const dom =
    fiber.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props)

  return dom
}

const isEvent = key => key.startsWith("on")
const isProperty = key =>
  key !== "children" && !isEvent(key)
const isNew = (prev, next) => key =>
  prev[key] !== next[key]
const isGone = (prev, next) => key => !(key in next)
function updateDom(dom, prevProps, nextProps) {
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      key =>
        !(key in nextProps) ||
        isNew(prevProps, nextProps)(key)
    )
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2)
      dom.removeEventListener(
        eventType,
        prevProps[name]
      )
    })

  // Remove old properties
Object.keys(prevProps)
  .filter(isProperty)
  .filter(isGone(prevProps, nextProps))
  .forEach(name => {
    dom[name] = ""
  })

// Set new or changed properties
Object.keys(nextProps)
  .filter(isProperty)
  .filter(isNew(prevProps, nextProps))
  .forEach(name => {
    dom[name] = nextProps[name]
  })

// Add event listeners
Object.keys(nextProps)
  .filter(isEvent)
  .filter(isNew(prevProps, nextProps))
  .forEach(name => {
    const eventType = name
      .toLowerCase()
      .substring(2)
    dom.addEventListener(
      eventType,
      nextProps[name]
    )
  })
}

function commitRoot() {
  deletions.forEach(commitWork)
  let needTobeCommitFiber = getNextFiber(wipRoot)
  commitWork(needTobeCommitFiber)
  currentRoot = wipRoot
  wipRoot = null
}

function commitWork(fiber) {
  if (!fiber) {
    return
  }

  const domParent = fiber.parentFiber.dom
  if (
    fiber.effectTag === "ADD" &&
    fiber.dom != null
  ) {
    domParent.appendChild(fiber.dom)
  } else if (
    fiber.effectTag === "UPDATE" &&
    fiber.dom != null
  ) {
    updateDom(
      fiber.dom,
      fiber.alternate.props,
      fiber.props
    )
  } else if (fiber.effectTag === "DELETE") {
    domParent.removeChild(fiber.dom)
  }
  //处理fiber和处理dom是一样的，先序遍历
  const nextFiber = getNextFiber(fiber)
  commitWork(nextFiber)
}

function render(element, container) {
  const RootFiber = new Fiber(container)
  RootFiber.props = {
    children:[element]
  }
  RootFiber.dom = container
  RootFiber.alternate = currentRoot
  deletions = []
  wipRoot = RootFiber
  //为container下的节点打上effectTag;
  nextUnitOfWork = RootFiber
}

let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let deletions = null

function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    //生成dom相关属性
    fiber.dom = createDom(fiber)
  }

  const elements = fiber.props.children
  reconcileChildren(fiber, elements)
  //查找下一个fiber并返回
  return getNextFiber(fiber)
}

function reconcileChildren(fiber) {
  let oldChildren = fiber?.alternate && fiber?.alternate?.childrenFiber
  //child的fiber的生成 以及挂载diff dom树
  generateChildrenFiber(fiber)
  const compareLength = oldChildren?.length||0 - fiber.childrenFiber.length
  if(compareLength>0){
    //先处理该删除的节点
    oldChildren.slice(compareLength+1).forEach(_deleteFiber=>{
      _deleteFiber.effectTag = 'DELETE'
      deletions.push(_deleteFiber)
    })
  }
  fiber.childrenFiber.forEach((childFiber,index)=>{
    //挂载dom树，打上effectTag
    if(oldChildren?.[index]&&childFiber.type ===oldChildren[index].type){
      childFiber.effectTag = 'UPDATE'
      childFiber.alternate = oldChildren[index]
      //dom树要挂上去
      childFiber.dom = oldChildren[index].dom
    }else{
      if(oldChildren?.[index]){
        oldChildren[index].effectTag ="DELETE"
        deletions.push(oldChildren[index])
      }
      childFiber.alternate = null
      childFiber.effectTag="ADD"
      //在commit时生成新的dom树
    }
  })

}

const Didact = {
  createElement,
  render,
}

/** @jsx Didact.createElement */
const container = document.getElementById("root")

const updateValue = e => {
  rerender(e.target.value)
}

const rerender = value => {
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <h2>Hello {value}</h2>
    </div>
  )
  Didact.render(element, container)
}

rerender("World")