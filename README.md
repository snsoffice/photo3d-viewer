# photo3d-viewer

使用三维模型显示照片像素坐标对应的空间坐标的网页版小工具

## 环境配置

* 下载 [three.js](https://github.com/mrdoob/three.js/releases)

* 解压下载好的文件，拷贝 **examples/js** 到 **./js**

* 拷贝 **build/three.js** 到 **./js**

## 快速开始

使用支持 WebGL 的浏览器（推荐 Firefox）打开 **index.html**

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
  
  "points3d": [ [x, y, z], ... ]
  
}
```

