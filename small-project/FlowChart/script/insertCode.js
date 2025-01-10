let mode = 0;
function insertCode(codeName, target, usermode = 99) {
  if (usermode != 99) mode = usermode;

  switch (codeName) {
    case 'ifelse':
      switch (mode) {
        case 0: target.value = 'if(a==1)\n  print(a);'; mode = 1; break;
        case 1: target.value = 'if(a==1) {\n  print(a);\n  if(a==2) {\n    print(b);\n    print(c);\n    if(a==3)\n      print(d);\n    else\n      print(e);\n  }\n} else\n  print(g);\nprint(h);'; mode = 2; break;
        default: target.value = 'if(a==1)\n  print(a);\nelse\n  print(b);'; mode = 0;
      }
      break;
    case 'for':
      switch (mode) {
        case 0: target.value = 'for(i=1;i<10;i++) {for(j=1;j<10;j++){print(i, j);}}'; mode = 1; break;
        case 1: target.value = '\\\\ type I;\n for (;  i<10;  i++) {\n  print(i);\n}\n\\\\ type II;\nfor (j=1;  j<10; ) {\n  print(i);\n}'; mode = 2; break;
        default: target.value = 'for(i=1;i<10;i++)\n  print(i);'; mode = 0;
      }
      break;
    case 'break':
      switch (mode) {
        case 0: target.value = 'for (i=1; i<10; i++) {\n  print(i);\n  if (i=5) {\n    break;\n  }\n  if (i=6) {\n    continue;\n  }\n}'; mode = 1; break;
        case 1: target.value = 'for (i=1; i<10; i++) {\n  if (i=6) {\n    continue;\n  }\n  print(i);\n  if (i=5) {\n    break;\n  }\n}'; mode = 2; break;
        default: target.value = 'for (i=1; i<10; i++) {\n  print(i);\n  if (i=5) {\n    break;\n  }\n}'; mode = 0;
      }
      break;
    case 'mixed':
      switch (mode) {
        case 0: target.value = 'if(코딩가능){\n  직접작성;\n} else {\n  for (; 예제; 변경) {\n    for (; \n선택; ) {\n      \'1→2→3\'\n    }\n  }\n}\nif (정렬원함) {\n  코드 정렬;\n}\n그리기\n다운로드'; mode = 1; break;
        default:
          target.value = 'if(a==1) {\n  print(a);\n  if(a==2) {\n    print(b);\n    print(c);\n    if (a==3) {\n      print(d);\n    } else {\n      print(e);\n    }\n  }\n} else {\n  for (i=1;  i<10;  i++) {\n    print(g);\n    if (i==5) {\n      break;\n    }\n  }\n}\nprint(h);'; mode = 0;
      }
      break;
  }
}