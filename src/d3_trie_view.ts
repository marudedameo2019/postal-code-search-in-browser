import { type TrieNode } from './trie.js'
import * as d3 from "d3";

/**
 * TRIE木をD3.jsを使用してビジュアライズします。
 * 
 * @param trie - 描画対象のTRIE木のルートノード
 * @param selector - SVG要素を追加するCSSセレクター（例: '#chart'）
 * @param width - SVGの幅（ピクセル）
 * @param height - SVGの高さ（ピクセル）
 */
export const addView = <T>(trie: TrieNode<T>, selector: string, width: number, height: number): void => {
    type CollapsibleHierarchyNode = Omit<d3.HierarchyNode<TrieNode<T>>, "children"> & {
        children?: CollapsibleHierarchyNode[] | undefined;
        _children?: CollapsibleHierarchyNode[] | undefined;
    };

    type CollapsibleHierarchyPointNode = Omit<d3.HierarchyPointNode<TrieNode<T>>, "children"> & {
        children?: CollapsibleHierarchyPointNode[] | undefined;
        _children?: CollapsibleHierarchyPointNode[] | undefined;
    };

    const svg = d3.select<SVGSVGElement, unknown>(selector).append("svg")
        .attr("width", width)
        .attr("height", height);

    const zoomGroup = svg.append("g");

    // 巨大データ用ズーム・パン機能
    svg.call(d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
    }));

    // 横型レイアウト用の間隔設定
    const treeLayout = d3.tree<TrieNode<T>>().nodeSize([40, 160]);

    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "rgba(33, 33, 33, 0.9)")
        .style("color", "#fff")
        .style("padding", "6px 10px")
        .style("border-radius", "4px")
        .style("font-size", "13px")
        .style("font-family", "sans-serif")
        .style("pointer-events", "none")
        .style("box-shadow", "0 2px 5px rgba(0,0,0,0.3)")
        .style("white-space", "nowrap")
        .style("z-index", "9999");

    const root = d3.hierarchy<TrieNode<T>>(trie) as unknown as CollapsibleHierarchyNode;

    root.descendants().forEach((d) => {
        const node = d as unknown as CollapsibleHierarchyNode;
        if (node.children) {
            node._children = node.children;
            node.children = undefined;
        }
    });

    // ルートの直下だけ展開しておく
    if (root._children) {
        root.children = root._children;
        root._children = undefined;
    }

    function update(source: CollapsibleHierarchyNode) {
        // 現在開いているノードだけでレイアウト計算
        const treeData = treeLayout(root as unknown as d3.HierarchyNode<TrieNode<T>>);
        const nodes = treeData.descendants() as unknown as CollapsibleHierarchyPointNode[];
        const links = treeData.links();

        // 画面中央左寄りに配置
        zoomGroup.attr("transform", `translate(100, ${height / 2})`);

        // ==========================================
        // 4. ノードの描画 (最新の .join() を使用)
        // ==========================================
        const nodeSelection = zoomGroup.selectAll<SVGGElement, CollapsibleHierarchyPointNode>("g.node")
            .data(nodes, (d) => (d as any).id || ((d as any).id = Math.random().toString()));

        const nodeEnter = nodeSelection.join(
            (enter) => {
                const g = enter.append("g")
                    .attr("class", "node")
                    .style("cursor", "pointer");

                g.append("circle").attr("r", 8);
                g.append("text");
                return g;
            }
        );

        // UI操作イベント対応
        nodeEnter.on("mouseover", (event, d) => {
            // ホバー時にポップアップを表示
            tooltip.text(d.data.key)
                .style("visibility", "visible");
        }).on("mousemove", (event) => {
            // マウスカーソルに追従
            tooltip
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 15) + "px");
        }).on("mouseout", () => {
            // 離れたら非表示
            tooltip.style("visibility", "hidden");
        }).on("click", (_event, d) => {
            const node = d as unknown as CollapsibleHierarchyNode;
            if (node.children) {
                node._children = node.children;
                node.children = undefined;
            } else if (node._children) {
                node.children = node._children;
                node._children = undefined;
            }
            update(node);
        });

        // 座標とスタイルの更新
        nodeEnter.attr("transform", (d) => `translate(${d.y}, ${d.x})`);

        nodeEnter.select("circle")
            .style("fill", (d) => d._children ? "steelblue" : "#fff")
            .style("stroke", "steelblue")
            .style("stroke-width", 2);

        nodeEnter.select("text")
            .attr("dy", ".35em")
            .attr("x", (d) => d.children || d._children ? -12 : 12)
            .attr("text-anchor", (d) => d.children || d._children ? "end" : "start")
            .text((d) => d.data.key)
            .style("font-size", "12px")
            .style("font-family", "sans-serif");

        // ==========================================
        // 5. リンク（線）の描画
        // ==========================================
        const linkSelection = zoomGroup.selectAll<SVGPathElement, d3.HierarchyLink<TrieNode<T>>>("path.link")
            .data(links, (d) => (d.target as any).id);

        const linkPath = d3.linkHorizontal<unknown, d3.HierarchyPointNode<TrieNode<T>>>()
            .x((d) => d.y)
            .y((d) => d.x);

        linkSelection.join("path")
            .attr("class", "link")
            .style("fill", "none")
            .style("stroke", "#ccc")
            .style("stroke-width", 1.5)
            .attr("d", linkPath as any);
    }

    update(root);
};
