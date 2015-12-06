# Token

## selectors
``` stylus
body
html
  height 100%

body,
html
  height 100%

body, html
  height 100%

  &.active
  &:after
    color red

:root
  div
    font-size 10px
    a
      color red

:root(.header)
  font-size 20px
  a
    color black
```

只需要判断是否是组合选择器即可，如果是组合选择器在Lexer中要拆分。如果是:root伪类的话，他的子Class选择器会自动转换为加SID前缀的。ROOT会有一个独立的TOKEN。
在识别token的时候可以将伪类和伪元素单独识别，判断是否为root，不是的话则为普通选择器。
父元素引用选择器也可以单独识别。
## statement
## @import, @require
## variables
## mixins
## call
## comments
## string

