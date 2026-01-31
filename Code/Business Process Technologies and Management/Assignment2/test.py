#!/usr/bin/python3
print('hello')
import xml.etree.ElementTree as ET

tree = ET.parse('my.bpmn')
root = tree.getroot()
print(root)