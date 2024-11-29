# Header Display Text

This is a plugin for [Obsidian](https://obsidian.md).

## Description

This plugin automatically sets the display text of links to headings of other notes to be the name of the heading instead of showing the link text as it appears. So, instead of:

``` Markdown
[[Title#Heading]]
```

The link will automatically update to:

``` Markdown
[[Title#Heading|Heading]]
```

This provides a nice appearance but saves the time of manually setting the display text, especially if you use tab to autocomplete the link (when you autocomplete, you have to navigate back in front of the brackets, add the vertical bar, and then type the heading name).

## Features

In the settings for this plugin, you can specify the format of the display text:

``` Markdown
Just the heading (default): [[Title#Heading|Heading]]
The heading and note name: [[Title#Heading|Title Heading]]
```
