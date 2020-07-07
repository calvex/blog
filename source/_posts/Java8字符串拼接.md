---
title: Java8字符串拼接
date: 2017-12-19 10:58:27
tags:
- Java
---
实际项目中会大量用到字符串拼接和分割的操作。  
在之前的项目中最常用的方法是通过StringBulider来循环拼接
```java
String substring ="";
StringBuilder stringBuilder = new StringBuilder();
for (Role role : roleArrayList) {
    stringBuilder.append(role.getCode()+",");
}
if (stringBuilder.length()>0){
    substring = stringBuilder.substring(0, stringBuilder.length() - 1);
}
System.out.println(substring);
```
这种方式不仅代码臃肿，而且效率低下。

在Java8中，通过2种方式可以拼接字符串  
#### 第一种，使用`String.join()`方法
```java
ArrayList<String> strings = new ArrayList<>();
strings.add("a");
strings.add("b");
strings.add("c");
String join = String.join(",", strings);
```
这种方式在数据量大的情况下会有`java.lang.OutOfMemoryError: Java heap space`异常，所以推荐使用第二种方式

#### 第二种，使用`Stream`的`Collectors.joining(",")`方法
```java
ArrayList<String> strings = new ArrayList<>();
strings.add("a");
strings.add("b");
strings.add("c");
String collect = strings.stream().collect(Collectors.joining(","));
```
### 测试
在使用Jmh进行压测后也发现Stream方式的字符串拼接也是速度最快的  
测试结果
```
Benchmark                         Mode  Cnt   Score    Error  Units
StringJoinTest.testStream         avgt   20  48.182 ±  0.926  ms/op
StringJoinTest.testStringBuilder  avgt   20  50.128 ±  4.089  ms/op
StringJoinTest.testStringJoin     avgt   20  56.251 ± 12.131  ms/op
StringJoinTest.testStringJoiner   avgt   20  53.924 ±  3.970  ms/op
```
测试代码

```Java
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MILLISECONDS)
@State(Scope.Thread)
@Warmup(iterations = 10)
@Measurement(iterations = 20)
@Fork(1)
public class StringJoinTest {

    public static List<String> stringList = new ArrayList<>();

    @Setup
    public void prepare() {
        for (int i = 0; i < 1000000; i++) {
            stringList.add(UUID.randomUUID().toString());
        }
    }

    @Benchmark
    public void testStream() {
        String collect = stringList.stream().collect(Collectors.joining(","));
    }

    @Benchmark
    public void testStringJoin() {
        String join = String.join(",", stringList);

    }

    @Benchmark
    public void testStringBuilder() {
        StringBuilder stringBuilder = new StringBuilder();
        for (String anInt : stringList) {
            stringBuilder.append(anInt).append(",");
        }
        if (stringBuilder.length() > 0) {
            String substring = stringBuilder.substring(0, stringBuilder.length() - 1);
        }
    }

    @Benchmark
    public void testStringJoiner() {
        StringJoiner stringJoiner = new StringJoiner(",");
        for (String anInt : stringList) {
            stringJoiner.add(anInt);
        }
        String s = stringJoiner.toString();

    }


    public static void main(String[] args) throws RunnerException {
        Options build = new OptionsBuilder().include(StringJoinTest.class.getSimpleName()).build();
        new Runner(build).run();
    }
}
```
