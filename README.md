# photo3d-viewer

使用三维模型显示照片像素坐标对应的空间坐标的网页版小工具

## 环境配置

* 下载 [three.js](https://github.com/mrdoob/three.js/releases)

* 解压下载好的文件

    * 拷贝 `examples/js` 到 `js/`

    * 拷贝 `build/three.js` 到 `js/`
    
    * 拷贝 `examples/textures` 到 `textures/`

## 快速开始

使用支持 WebGL 的浏览器（推荐 Firefox）打开 `index.html`

在浏览器地址栏后面输入需要打开的文件，例如 `index.html?config=debug-data.json`

如果浏览器不允许打开本地文件，那么在当前目录下启动一个本地 HTTP 服务

```bash
    python -m SimpleHTTPServer
```

然后在浏览器输入地址 `http://localhost:8000?config=debug-data.json`

### 基本操作

* 鼠标左键拖曳可以旋转三维模型
* 鼠标右键拖曳可以移动三维模型
* 鼠标滚轮可以放大和缩小三维模型

* 鼠标指针移动到三维空间点，在网页右下角会显示对应的索引、图片坐标和三维坐标值

* 右上角控制窗口 scale 可以调整三维空间点的显示比例
* 右上角控制窗口 grid 可以显示和隐藏网格

## 输入文件格式

data.json

```
{
  "version": 0.1,

  "image": {

    "url": "http://xxx/yyy/zzz.jpg",
    "size": [width, height],
    "points": [ [x, y], [x, y], ... ]

  },

  "refimage": {

    "url": "http://xxx/yyy/zzz.jpg",
    "size": [width, height],
    "points": [ [x, y], [x, y], ... ]

  },

  "points3d": [ [x, y, z], ... ]

}
```
