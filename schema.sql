-- ============================================================
-- 海外客户破冰助手 — 数据库 Schema
-- 用于 Vercel Postgres（生产版本）
-- Demo 版本使用内嵌静态数据（src/lib/standards.ts）
-- ============================================================

-- 国家表
CREATE TABLE IF NOT EXISTS countries (
    code VARCHAR(2) PRIMARY KEY,          -- ISO 3166-1 alpha-2 (US, PL, FR)
    name_zh VARCHAR(100) NOT NULL,         -- 中文名
    name_en VARCHAR(100) NOT NULL,         -- 英文名
    region VARCHAR(50),                    -- 所属区域
    language VARCHAR(100),                -- 主要语言
    notes TEXT                             -- 市场备注
);

-- 管道标准表
CREATE TABLE IF NOT EXISTS standards (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL REFERENCES countries(code),
    standard_code VARCHAR(50) NOT NULL,   -- 如 ASTM D3350, PN-EN 12201
    standard_name VARCHAR(200) NOT NULL,  -- 标准名称
    category VARCHAR(50),                 -- 给水/排水/燃气/工业
    material VARCHAR(50),                 -- PE/PVC/PEX/PPR/HDPE
    description TEXT,                    -- 标准描述
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 话术模板表（备用，不影响 Demo）
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2),
    business_type VARCHAR(50),            -- 批发/工程/分销/制造商
    language VARCHAR(50),                 -- en/fr/pl
    template_text TEXT NOT NULL,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_standards_country ON standards(country_code);
CREATE INDEX IF NOT EXISTS idx_standards_material ON standards(material);
CREATE INDEX IF NOT EXISTS idx_templates_country ON templates(country_code);

-- ============================================================
-- 初始数据：美国、波兰、法国
-- ============================================================

INSERT INTO countries (code, name_zh, name_en, region, language, notes) VALUES
('US', '美国', 'United States', '北美洲', 'English', '全球最大管道市场，偏好PEX和PVC，NSF 61认证是入门门槛'),
('PL', '波兰', 'Poland', '中东欧', 'English / Polski', '中东欧最大管道市场，PE-Xa和PPR主导，DVGW认证认可度高'),
('FR', '法国', 'France', '西欧', 'English / Français', '注重ACS卫生认证和NF标志，地暖系统普及率高，环保要求严格')
ON CONFLICT (code) DO NOTHING;

INSERT INTO standards (country_code, standard_code, standard_name, category, material, description) VALUES
-- US Standards
('US', 'ASTM D3350', '聚乙烯塑料管材料标准', '给水', 'PE', 'PE4710（高密度PE）给水管材料，等同于ISO 4427，北美市场基础标准'),
('US', 'ASTM F876/F877', '交联聚乙烯（PEX）管标准', '给水', 'PEX', '冷热水用PEX管，住宅市场占比超60%，北美最主流室内给水管材'),
('US', 'NSF/ANSI 61', '饮用水系统部件健康影响标准', '认证', '通用', '进入美国市场的管道产品必须获得的卫生认证'),
('US', 'AWWA C900/C906', 'PVC压力管道标准', '给水', 'PVC', '给水用PVC管道，规格从4"到60"，CI/FPR/PIJ接口类型'),
('US', 'IPC', '国际管道规范', '安装', '通用', 'International Plumbing Code，美国多数州采用的管道安装标准'),

-- PL Standards
('PL', 'PN-EN 12201', '供水用塑料管道系统——聚乙烯（PE）', '给水', 'PE', '等效采用EN 12201，PE给水管标准，规格覆盖DN16-DN1600'),
('PL', 'PN-EN 1401', '地下排水和污水用塑料管道系统——PVC-U', '排水', 'PVC-U', '非压力地下排水管，SN2-SN16环刚度等级'),
('PL', 'PN-EN 1452', '供水用塑料管道系统——PVC-C', '给水', 'PVC-C', '冷热水用氯化聚氯乙烯管道系统'),
('PL', 'PN-B-10711', '燃气聚乙烯管道安装标准', '燃气', 'PE', '波兰燃气管道施工规范，与EN 1555等效'),
('PL', 'DVGW W270', '塑料材料微生物生长测试', '认证', '通用', '德国水气协会认证，波兰市场认可度极高，高端项目必备'),

-- FR Standards
('FR', 'NF EN ISO 15875', '冷热水装置用塑料管道系统——PEX', '给水', 'PEX', '交联聚乙烯管道法国等效标准，规格16-63mm'),
('FR', 'NF EN ISO 22391', '低温地面辐射供暖系统用塑料管道', '供暖', 'PE-RT', 'PE-RT II型地暖管道标准，法国地暖普及率高'),
('FR', 'NF P 41-211', '冷热水分配装置规范', '安装', '通用', '法国建筑规范中管道安装的具体要求'),
('FR', 'ACS', 'Attestation de Conformité Sanitaire 卫生合格证', '认证', '通用', '法国卫生合格证，所有饮用水管道产品必须申请，缺此证无法进入法国市场'),
('FR', 'NF EN 12201', '供水用PE管道系统', '给水', 'PE', '与波兰相同，等效EN标准，大口径市政供水管主流标准')
ON CONFLICT DO NOTHING;
