---
name: 租房对比采集
description: 从租房详情页抽取可横向对比的结构化 JSON。不做多套房排序或推荐结论。
---

# 目的

从当前**租房详情页**抽取可对比字段，输出单条房源 JSON，便于落库；也可把该 JSON 交给「租房避坑评估」做体检（评估不强制要 JSON）。

本 Skill **只做采集**，不输出风险结论或「哪套更好」。

# 输出要求

- 只输出**一个** JSON 对象，结构必须符合下方「输出契约」。
- 不要输出解释性正文、Markdown 围栏外的闲聊。
- 无法确定的字段用 `null`；数组无数据用 `[]`。
- 关键字段（`cost.rentMonthly`、`space.areaSqm`、城市或小区、`rentType`）缺失时仍输出该字段为 `null`，不要臆造。

# 不要抽取

- 经纪人**个人**姓名、手机号、微信号（对比用不到，且偏隐私）
- 投诉电话、处罚记录入口、合同示范等信任营销文案与入口按钮
- 推荐房源、附近房源列表
- 照片 URL 清单与张数统计（除非用户明确只要户型图）
- 页面埋点、分享二维码

> 中介/运营**公司或品牌**必须抽取，见 `agency`。个人联系方式不要抽。

# 字段推导

- `flags.commercialWaterOrElectric`：用水为商水或用电为商电 → `true`
- `flags.noElevatorAndHighFloor`：无电梯且高楼层 → `true`
- `rentType` 为整租时：`coliving.households`、`coliving.occupiedRooms` 均为 `null`（不要用户型室数去填）
- `rentType` 为合租时：页面写了一共几户 / 几间住人则填数字；没写则 `null`，不要用 `space.bedrooms` 代替「几户」
- `location.nearestSubway`：只保留最近 1～3 个地铁站，按 `distanceMeters` 升序
- `cost.tenantPays` = 承租人（租客）负担；`cost.landlordPays` = 出租人（房东）负担
- `space.elevator`：有 → `true`，无 → `false`
- 必备设施若页面标明缺失，放入 `facilities.unavailable`（尤其关注：床、冰箱、洗衣机、空调、热水器、宽带）
- `agency.partyType`：根据页面文案推断挂牌主体类型；不确定用 `unknown`，不要猜成二房东
  - `agency`：链家/我爱我家等经纪公司居间
  - `brand_apartment`：自如、相寓、即刻租等品牌公寓/托管产品
  - `sublessor`：明确二房东、转租、包租
  - `landlord`：房东直租、个人房东
  - `unknown`：无法判断

# 字段注释（英文字段 ↔ 页面中文）

输出 JSON 使用英文字段名；抽取时按页面中文标签对齐。下列为对照，**不要**把本表写进输出 JSON。

## 顶层

| 字段 | 页面/含义 |
|------|-----------|
| `id` | 房源编号（如链家 `BJ…` / houseCode） |
| `url` | 详情页 URL |
| `title` | 房源标题 |
| `rentType` | 租赁方式：整租 / 合租 |

## `coliving` 合租规模（整租不填）

| 字段 | 页面/含义 |
|------|-----------|
| `households` | 合租一共几户（整租 → `null`；页面未写 → `null`） |
| `occupiedRooms` | 合租几间住人（整租 → `null`；与 `space.bedrooms` 不同：后者是户型室数） |

## `agency` 挂牌主体（中介 / 品牌 / 二房东等）

| 字段 | 页面/含义 |
|------|-----------|
| `platform` | 信息所在平台（如链家、贝壳、闲鱼） |
| `brand` | 房源品牌或产品名（如即刻租、自如；无则 `null`） |
| `company` | 运营/经纪公司名（如惠居产研、某门店所属公司；页面有则填） |
| `partyType` | 挂牌主体类型：`agency` / `brand_apartment` / `sublessor` / `landlord` / `unknown` |
| `productType` | 产品形态（如普租、省心租；无则 `null`） |
| `note` | 页面上有助于判断主体的短句（可选，无则 `null`） |

## `cost` 费用

| 字段 | 页面/含义 |
|------|-----------|
| `rentMonthly` | 租金（元/月） |
| `paymentMethod` | 付款方式（月付 / 季付 / 年付等） |
| `deposit` | 押金（元） |
| `agencyFee` | 中介费 / 居间代理费（元，多为一次性） |
| `serviceFeeYearly` | 服务费（元/年） |
| `tenantPays` | 承租人（租客）负担费用项 |
| `landlordPays` | 出租人（房东）负担费用项 |

## `location` 位置

| 字段 | 页面/含义 |
|------|-----------|
| `city` / `district` / `bizcircle` / `community` | 城市 / 区县 / 商圈 / 小区 |
| `coordinates` | 坐标（经度 `longitude`、纬度 `latitude`） |
| `nearestSubway` | 附近地铁：站名 `station`、线路 `lines`、距离米 `distanceMeters` |

## `space` 户型与楼况

| 字段 | 页面/含义 |
|------|-----------|
| `bedrooms` / `livingRooms` / `bathrooms` | 室 / 厅 / 卫 |
| `areaSqm` | 面积（㎡） |
| `orientation` | 朝向 |
| `floorLevel` | 楼层档位（高/中/低楼层） |
| `totalFloors` | 总层数 |
| `elevator` | 电梯（有→`true`，无→`false`） |
| `decoration` | 装修（如精装修） |
| `parking` | 车位 |

## `utilities` 水电燃气采暖

| 字段 | 页面/含义 |
|------|-----------|
| `water` | 用水（民水 / 商水） |
| `electricity` | 用电（民电 / 商电） |
| `gas` | 燃气 |
| `heating` | 采暖（集中供暖 / 自采暖等） |

## `facilities` 配套设施

| 字段 | 页面/含义 |
|------|-----------|
| `available` | 有的配套（洗衣机、空调等） |
| `unavailable` | 明确没有的配套 |

## `lease` 租约条件（非租金、非户型）

| 字段 | 页面/含义 |
|------|-----------|
| `checkIn` | **入住**（何时可搬入，如「随时入住」；英文名偏酒店习惯，此处等同租房「入住」） |
| `viewing` | **看房**（何时可看，如「随时可看」；英式 viewing ≈ 看房） |
| `leaseTerm` | **租期**（最短/约定租多久；「暂无数据」→ `null`） |

## `tags` / `flags`

| 字段 | 含义 |
|------|------|
| `tags` | 房源标签（精装、随时看房等） |
| `flags.commercialWaterOrElectric` | 是否商水或商电 |
| `flags.noElevatorAndHighFloor` | 是否无电梯且高楼层 |

# 输出契约

AI 最终**只**输出如下形状的 JSON（字段名与类型保持一致）：

```json
{
  "id": "string",
  "url": "string",
  "title": "string",
  "rentType": "整租 | 合租",
  "coliving": {
    "households": "number|null",
    "occupiedRooms": "number|null"
  },
  "agency": {
    "platform": "string|null",
    "brand": "string|null",
    "company": "string|null",
    "partyType": "agency | brand_apartment | sublessor | landlord | unknown",
    "productType": "string|null",
    "note": "string|null"
  },
  "cost": {
    "rentMonthly": "number",
    "paymentMethod": "string|null",
    "deposit": "number|null",
    "agencyFee": "number|null",
    "serviceFeeYearly": "number|null",
    "tenantPays": ["string"],
    "landlordPays": ["string"]
  },
  "location": {
    "city": "string|null",
    "district": "string|null",
    "bizcircle": "string|null",
    "community": "string|null",
    "coordinates": {
      "longitude": "string|number|null",
      "latitude": "string|number|null"
    },
    "nearestSubway": [
      {
        "station": "string",
        "lines": ["string"],
        "distanceMeters": "number"
      }
    ]
  },
  "space": {
    "bedrooms": "number|null",
    "livingRooms": "number|null",
    "bathrooms": "number|null",
    "areaSqm": "number|null",
    "orientation": ["string"],
    "floorLevel": "string|null",
    "totalFloors": "number|null",
    "elevator": "boolean|null",
    "decoration": "string|null",
    "parking": "string|null"
  },
  "utilities": {
    "water": "string|null",
    "electricity": "string|null",
    "gas": "boolean|null",
    "heating": "string|null"
  },
  "facilities": {
    "available": ["string"],
    "unavailable": ["string"]
  },
  "lease": {
    "checkIn": "string|null",
    "viewing": "string|null",
    "leaseTerm": "string|null"
  },
  "tags": ["string"],
  "flags": {
    "commercialWaterOrElectric": "boolean",
    "noElevatorAndHighFloor": "boolean"
  }
}
```

> `lease`：`checkIn`→入住，`viewing`→看房，`leaseTerm`→租期。输出仍用英文字段名。

# 示例（链家整租详情，仅作形状参考）

```json
{
  "id": "BJ2196277172245626880",
  "url": "https://bj.lianjia.com/zufang/BJ2196277172245626880.html",
  "title": "整租·新壁街 3室1厅 南/北",
  "rentType": "整租",
  "coliving": {
    "households": null,
    "occupiedRooms": null
  },
  "agency": {
    "platform": "链家",
    "brand": "即刻租",
    "company": "惠居产研",
    "partyType": "brand_apartment",
    "productType": "普租",
    "note": "普租→省心租的中间态产品"
  },
  "cost": {
    "rentMonthly": 12500,
    "paymentMethod": "季付",
    "deposit": 12500,
    "agencyFee": 12500,
    "serviceFeeYearly": 0,
    "tenantPays": ["水费", "电费", "燃气费", "停车费"],
    "landlordPays": ["物业服务费", "供暖费"]
  },
  "location": {
    "city": "北京",
    "district": "西城区",
    "bizcircle": "西单",
    "community": "新壁街",
    "coordinates": {
      "longitude": "116.38656460069",
      "latitude": "39.908054939761"
    },
    "nearestSubway": [
      {
        "station": "和平门",
        "lines": ["2号线"],
        "distanceMeters": 438
      },
      {
        "station": "宣武门",
        "lines": ["2号线", "4号线大兴线"],
        "distanceMeters": 616
      }
    ]
  },
  "space": {
    "bedrooms": 3,
    "livingRooms": 1,
    "bathrooms": 2,
    "areaSqm": 108.77,
    "orientation": ["南", "北"],
    "floorLevel": "高楼层",
    "totalFloors": 6,
    "elevator": false,
    "decoration": "精装修",
    "parking": null
  },
  "utilities": {
    "water": "民水",
    "electricity": "民电",
    "gas": true,
    "heating": "自采暖"
  },
  "facilities": {
    "available": ["洗衣机", "空调", "衣柜", "冰箱", "热水器", "床", "暖气", "天然气"],
    "unavailable": ["电视", "宽带"]
  },
  "lease": {
    "checkIn": "随时入住",
    "viewing": "随时可看",
    "leaseTerm": null
  },
  "tags": ["精装", "双卫生间", "随时看房"],
  "flags": {
    "commercialWaterOrElectric": false,
    "noElevatorAndHighFloor": true
  }
}
```

# 相关 Skill

避坑体检请改用 **租房避坑评估**（输入不限格式；本 Skill 的 JSON 只是可选材料之一）。
