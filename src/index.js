function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children
    }
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: []
    }
  };
}



//生成fiber
//render当前fiber
//generate下一个fiber

class Fiber{
  constructor(element,nextSilbling,parent){
    this.type = element.type
    this.children = element?.props?.children
    this.props = element.props
    this.parent = parent
    this.childrenFiber = null
    this.nextSilbling = nextSilbling
    this.dom = null
    this.toNodes(element)
  }
  toNodes(element){
    if(typeof element ==='string'){
      this.type = "TEXT_ELEMENT"
      this.props={
        nodeValue:element
      }
    }
  }
}
function getNextFiber(_currentFiber){
  //element上有parent,sibling,children
  if(_currentFiber?.childrenFiber?.length){//如果有子节点，nextFiber就是子节点。
    return _currentFiber.childrenFiber[0]
  }
  if(_currentFiber?.nextSilbling){
    return _currentFiber.nextSilbling
  }
  var _parent = _currentFiber?.parent
  while(_parent){
    //这里怎么表示根节点
    if(_parent?.nextSilbling){
      return _parent.nextSilbling
    }else{
      _parent = _parent.parent
    }
  }
  return null
}


function generateChildrenFiber(_currentFiber){
  const _childrenFibers = []
  const childrenElements = _currentFiber.children
  function reducer(nextSilbling,_currentChild){
    const _currentChildFiber = new Fiber(_currentChild,nextSilbling,_currentFiber)
    _childrenFibers.unshift(_currentChildFiber)
    return _currentChildFiber
  }
  childrenElements?.length>0&&childrenElements.reduceRight(reducer,null)
  _currentFiber.childrenFiber = _childrenFibers
}

function renderNode(element,container){
  const dom =
  element.type == "TEXT_ELEMENT"
    ? document.createTextNode("")
    : document.createElement(element.type);
  const isProperty = key => key !== "children";
  Object.keys(element?.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element?.props[name];
    });
  container.appendChild(dom);
  return dom
}

function render(element) {
  var nextUnitOfWork = new Fiber(element)
  function performUnitOfWork(fiber){
      const container = fiber?.parent?.dom || document.getElementById('root')
      const dom = renderNode(fiber,container)
      fiber.dom = dom
      generateChildrenFiber(fiber)
      return getNextFiber(fiber)
    }
  
  function workLoop(deadline) {
      let shouldYield = false
      while (nextUnitOfWork && !shouldYield) {
          nextUnitOfWork = performUnitOfWork(
          nextUnitOfWork
          )
          shouldYield = deadline.timeRemaining() < 1
      }
      nextUnitOfWork&&requestIdleCallback(workLoop)
  }
  requestIdleCallback(workLoop)
}



const Runact = {
  createElement,
  render,
};

/** @jsx Runact.createElement */
const element = (
  <div style="background: salmon">
    <h1>Hello World
      <h1>child</h1>
      <h1>child2
          <h1>child</h1>
          <h1>child2</h1>
      </h1>
    </h1>
    <h2 style="text-align:right">from Didact</h2>
  </div>
);
/** @jsx Runact.createElement */
const container = document.getElementById("root")

Runact.render(element,container)

