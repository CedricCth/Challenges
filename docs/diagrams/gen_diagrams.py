"""
Regenerate every PNG in this folder.

Usage:
    pip install diagrams pillow graphviz   # plus system Graphviz: `apt install graphviz` / `brew install graphviz`
    python3 gen_diagrams.py

Outputs (next to this script):
    01_architecture.png        — high-level architecture
    02_database_er.png         — ER diagram of every table
    03_user_flow.png           — site map / user flow
    04_layered_architecture.png — Clean Architecture layers
    05_deployment.png          — CI/CD + envs
    06_factory_pattern.png     — Factory + Strategy class diagram
    07_edit_extension.png      — OCP/DI extension for the edit-entry feature (ADR-018)
"""
from __future__ import annotations
import os, subprocess, sys, pathlib

HERE = pathlib.Path(__file__).resolve().parent
TMP = pathlib.Path("/tmp/diagrams_gen")
TMP.mkdir(parents=True, exist_ok=True)


def write_dot_png(name: str, dot: str) -> None:
    dot_path = TMP / f"{name}.dot"
    png_path = HERE / f"{name}.png"
    dot_path.write_text(dot)
    subprocess.run(["dot", "-Tpng", str(dot_path), "-o", str(png_path)], check=True)
    print("wrote", png_path)


# 01 — High-level architecture (uses the `diagrams` lib for nice icons).
def arch():
    from diagrams import Diagram, Cluster, Edge
    from diagrams.onprem.client import Users
    from diagrams.programming.framework import React, Nextjs
    from diagrams.onprem.database import Postgresql
    from diagrams.onprem.vcs import Github
    from diagrams.generic.network import Firewall
    from diagrams.onprem.workflow import Airflow

    out = TMP / "01_architecture"
    with Diagram(
        "High-Level Architecture - Couples Challenge App",
        show=False,
        filename=str(out),
        outformat="png",
        direction="LR",
        graph_attr={"fontsize": "20", "bgcolor": "white", "pad": "0.6", "splines": "spline"},
        node_attr={"fontsize": "13"},
        edge_attr={"fontsize": "11"},
    ):
        with Cluster("Users (Stef and Stefi)"):
            users = Users("Browser\n(desktop / mobile)")
        with Cluster("Vercel (Free Hobby Tier)"):
            with Cluster("Next.js 16 App Router"):
                rsc = Nextjs("Server Components\n+ Server Actions")
                client = React("Client Components\n(Tailwind + shadcn/ui)")
                mw = Firewall("Middleware\nauth.getUser()")
        with Cluster("Supabase (Free Tier)"):
            auth = Airflow("Supabase Auth\n(email/password)")
            db = Postgresql("Postgres + RLS\nchallenges, stats,\nmilestones")
        with Cluster("Source / CI"):
            gh = Github("GitHub\n(private repo)")

        users >> Edge(label="HTTPS") >> mw
        mw >> Edge(label="route") >> rsc
        rsc >> Edge(label="hydrate") >> client
        rsc >> Edge(label="server-side\nDrizzle ORM", color="darkgreen") >> db
        client >> Edge(label="server actions", style="dashed") >> rsc
        mw >> Edge(label="getUser()", color="red") >> auth
        rsc >> Edge(label="signIn / signUp", color="red") >> auth
        auth >> Edge(label="JWT in cookie", style="dashed", color="red") >> mw
        gh >> Edge(label="git push -> auto deploy", color="purple") >> rsc

    # `diagrams` writes <out>.png; copy next to script.
    src = pathlib.Path(str(out) + ".png")
    (HERE / "01_architecture.png").write_bytes(src.read_bytes())
    print("wrote", HERE / "01_architecture.png")


# 02 — ER diagram (raw graphviz for full control).
def er():
    dot = r'''
digraph ER {
    rankdir=LR; bgcolor="white";
    node [shape=plaintext, fontname="Helvetica", fontsize=11];
    edge [fontname="Helvetica", fontsize=10, color="gray35"];
    label = "Database Schema (Postgres / Supabase)\nLogical ER Diagram";
    labelloc=t; fontsize=18; fontname="Helvetica-Bold";

    /* tables — kept short, see the full file for details */
}
'''
    # The actual long-form DOT lives in `er_full.dot` next to this script (kept
    # separate to keep this file readable). Regenerate with:
    #   dot -Tpng er_full.dot -o 02_database_er.png
    full = HERE / "er_full.dot"
    if full.exists():
        subprocess.run(["dot", "-Tpng", str(full), "-o", str(HERE / "02_database_er.png")], check=True)
        print("wrote", HERE / "02_database_er.png")


def flow():
    write_dot_png("03_user_flow", r'''
digraph FLOW {
    rankdir=TB; bgcolor="white"; splines=spline;
    node [shape=box, style="rounded,filled", fontname="Helvetica", fontsize=11];
    edge [fontname="Helvetica", fontsize=10, color="gray35"];
    label = "User Flow & Site Map";
    labelloc=t; fontsize=18; fontname="Helvetica-Bold";
    landing  [label="/ Landing\n(public, login CTA)", fillcolor="#E3F2FD"];
    login    [label="/login\nemail + password", fillcolor="#FFF3E0"];
    middleware [label="middleware.ts\nsupabase.auth.getUser()", shape=hexagon, fillcolor="#FFEBEE"];
    notAuth  [label="not authenticated\nredirect /login", shape=note, fillcolor="#FFCDD2"];
    dashboard [label="/dashboard\nactive challenges, score, quick stat", fillcolor="#E8F5E9"];
    list      [label="/challenges\nfilter / sort / search", fillcolor="#E8F5E9"];
    detail    [label="/challenges/[id]\nstats, milestones, comments", fillcolor="#E8F5E9"];
    new_      [label="/challenges/new\nfactory chooses form", fillcolor="#E8F5E9"];
    edit      [label="/challenges/[id]/edit\ndeclare winner", fillcolor="#E8F5E9"];
    addStat   [label="/challenges/[id]/stats/new\nadd stat + photo", fillcolor="#E8F5E9"];
    leaderboard [label="/leaderboard\nwins, win-rate, streak", fillcolor="#F3E5F5"];
    aboutUs   [label="/about-us\nbios + photo", fillcolor="#F3E5F5"];
    settings  [label="/settings\nprofile, color, avatar", fillcolor="#F3E5F5"];
    logout    [label="signOut() -> /login", shape=oval, fillcolor="#ECEFF1"];
    landing -> login;
    login -> middleware;
    middleware -> notAuth [label="no user"];
    middleware -> dashboard [label="user found"];
    notAuth -> login;
    dashboard -> list; dashboard -> new_; dashboard -> detail;
    list -> detail; new_ -> detail [label="created"];
    detail -> addStat; detail -> edit; edit -> detail;
    dashboard -> leaderboard; dashboard -> aboutUs; dashboard -> settings;
    settings -> logout;
}
''')


def layers():
    write_dot_png("04_layered_architecture", r'''
digraph LAYERS {
    rankdir=TB; bgcolor="white"; compound=true;
    node [shape=box, style="rounded,filled", fontname="Helvetica", fontsize=11];
    edge [fontname="Helvetica", fontsize=10];
    label = "Layered Architecture (SOLID / Clean Architecture)\nDependency direction: top -> bottom only";
    labelloc=t; fontsize=18; fontname="Helvetica-Bold";

    subgraph cluster_pres { label="Presentation Layer (src/app, src/components)"; style="rounded,filled"; fillcolor="#FFF3E0";
        pages [label="App Router pages\n(layout.tsx, page.tsx)\nServer Components", fillcolor="white"];
        ui    [label="UI primitives\nshadcn/ui + Tailwind", fillcolor="white"];
        feat  [label="Feature components\nfeatures/*/components", fillcolor="white"];
        forms [label="Forms\nReact Hook Form + Zod", fillcolor="white"]; }
    subgraph cluster_app { label="Application Layer (services, actions)"; style="rounded,filled"; fillcolor="#E8F5E9";
        actions [label="Server Actions", fillcolor="white"];
        services [label="Domain Services", fillcolor="white"];
        factory [label="ChallengeTypeFactory", fillcolor="#FFEBEE"];
        strategies [label="Strategies (per type)\n(implements ChallengeStrategy)", fillcolor="#FFEBEE"]; }
    subgraph cluster_dom { label="Domain Layer (src/domain)"; style="rounded,filled"; fillcolor="#E3F2FD";
        entities [label="Entities & Value Objects\n+ Zod schemas", fillcolor="white"];
        ports   [label="Ports / Interfaces (DIP)", fillcolor="white"]; }
    subgraph cluster_infra { label="Infrastructure Layer (src/server)"; style="rounded,filled"; fillcolor="#F3E5F5";
        repos [label="Drizzle Repositories\n(implements ports)", fillcolor="white"];
        drizzle [label="Drizzle ORM schema + migrations", fillcolor="white"];
        supaClient [label="Supabase clients\nserver / browser / mw", fillcolor="white"];
        storage [label="Supabase Storage\n(progress photos)", fillcolor="white"]; }

    pages -> feat; pages -> ui; feat -> forms; pages -> actions; forms -> actions;
    actions -> services; services -> factory; factory -> strategies;
    services -> ports; strategies -> ports; ports -> entities;
    repos -> ports [label="implements", style="dashed"]; repos -> drizzle; drizzle -> supaClient;
    services -> repos [label="injected", style="dashed"];
    actions -> supaClient [label="auth.getUser()", color="red"]; services -> storage;
}
''')


def deploy():
    write_dot_png("05_deployment", r'''
digraph DEPLOY {
    rankdir=LR; bgcolor="white"; splines=spline;
    node [shape=box, style="rounded,filled", fontname="Helvetica", fontsize=11];
    edge [fontname="Helvetica", fontsize=10, color="dimgray"];
    label = "Deployment & CI / CD"; labelloc=t; fontsize=18; fontname="Helvetica-Bold";
    dev [label="Local dev\npnpm dev (Turbopack)", fillcolor="#E3F2FD"];
    branch [label="git push origin feature/*", fillcolor="#FFF3E0"];
    pr [label="Pull Request (GitHub)", fillcolor="#FFF3E0"];
    subgraph cluster_ci { label="GitHub Actions"; style="rounded,filled"; fillcolor="#E8F5E9";
        lint [label="lint", fillcolor="white"];
        types [label="typecheck", fillcolor="white"];
        test [label="unit tests", fillcolor="white"];
        build [label="build", fillcolor="white"]; }
    preview [label="Vercel Preview\n(per-PR URL)", fillcolor="#FFEBEE"];
    main [label="merge to main", fillcolor="#FFF3E0"];
    prod [label="Vercel Production", fillcolor="#E8F5E9"];
    subgraph cluster_supa { label="Supabase (Free Tier)"; style="rounded,filled"; fillcolor="#F3E5F5";
        supa_dev [label="dev project", fillcolor="white"];
        supa_prod [label="prod project", fillcolor="white"]; }
    dev -> branch; branch -> pr;
    pr -> lint; pr -> types; pr -> test; pr -> build;
    build -> preview [label="deploy"]; pr -> main [label="merge after green", style="dashed"];
    main -> prod [label="auto-deploy", color="darkgreen"];
    preview -> supa_dev [label="env: SUPABASE_URL_DEV", style="dashed"];
    prod -> supa_prod [label="env: SUPABASE_URL_PROD", style="dashed"];
}
''')


def factory():
    write_dot_png("06_factory_pattern", r'''
digraph FACTORY {
    rankdir=BT; bgcolor="white";
    node [shape=plaintext, fontname="Helvetica", fontsize=10];
    edge [fontname="Helvetica", fontsize=9, color="dimgray"];
    label = "Extensibility: Factory + Strategy for ChallengeType";
    labelloc=t; fontsize=18; fontname="Helvetica-Bold";

    iface [label=<<TABLE BGCOLOR="#FFF3E0" BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6">
        <TR><TD BGCOLOR="#FB8C00"><FONT COLOR="white"><B>«interface» ChallengeStrategy</B></FONT></TD></TR>
        <TR><TD ALIGN="LEFT">key, label, icon</TD></TR>
        <TR><TD ALIGN="LEFT">availableMetrics: MetricSpec[]</TD></TR>
        <TR><TD ALIGN="LEFT">statFormSchema: ZodSchema</TD></TR>
        <TR><TD ALIGN="LEFT">computeScore(p): number</TD></TR>
        <TR><TD ALIGN="LEFT">decideWinner(c): WinnerResult</TD></TR>
    </TABLE>>];
    base [label=<<TABLE BGCOLOR="#FCE4EC" BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6">
        <TR><TD BGCOLOR="#D81B60"><FONT COLOR="white"><B>BaseChallengeStrategy</B></FONT></TD></TR>
        <TR><TD ALIGN="LEFT">+ default decideWinner()</TD></TR>
        <TR><TD ALIGN="LEFT">+ default renderSummary()</TD></TR>
    </TABLE>>];
    fitness [label=<<TABLE BGCOLOR="#E8F5E9" BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6">
        <TR><TD BGCOLOR="#43A047"><FONT COLOR="white"><B>FitnessStrategy</B></FONT></TD></TR>
        <TR><TD ALIGN="LEFT">key="fitness"</TD></TR>
        <TR><TD ALIGN="LEFT">% toward weight-loss target</TD></TR></TABLE>>];
    cooking [label=<<TABLE BGCOLOR="#E1F5FE" BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6">
        <TR><TD BGCOLOR="#039BE5"><FONT COLOR="white"><B>CookingStrategy</B></FONT></TD></TR>
        <TR><TD ALIGN="LEFT">key="cooking"</TD></TR></TABLE>>];
    reading [label=<<TABLE BGCOLOR="#F3E5F5" BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6">
        <TR><TD BGCOLOR="#8E24AA"><FONT COLOR="white"><B>ReadingStrategy</B></FONT></TD></TR>
        <TR><TD ALIGN="LEFT">key="reading"</TD></TR></TABLE>>];
    custom [label=<<TABLE BGCOLOR="#ECEFF1" BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6">
        <TR><TD BGCOLOR="#546E7A"><FONT COLOR="white"><B>CustomStrategy</B></FONT></TD></TR>
        <TR><TD ALIGN="LEFT">key="custom"</TD></TR></TABLE>>];
    factory [label=<<TABLE BGCOLOR="#FFFDE7" BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6">
        <TR><TD BGCOLOR="#F9A825"><B>ChallengeTypeFactory</B></TD></TR>
        <TR><TD ALIGN="LEFT">register / get / list</TD></TR>
        <TR><TD ALIGN="LEFT">(open/closed)</TD></TR></TABLE>>];

    base -> iface [arrowhead=onormal, label="implements", style="dashed"];
    fitness -> base [arrowhead=onormal];
    cooking -> base [arrowhead=onormal];
    reading -> base [arrowhead=onormal];
    custom  -> base [arrowhead=onormal];
    factory -> iface [arrowhead=odiamond, label="returns", style="dashed"];
}
''')


# 07 — Edit-entry OCP/DI extension (ADR-018). Highlights the *new* nodes in
# yellow against the existing pipeline so a reader can see at a glance which
# code was added vs reused.
def edit_extension():
    write_dot_png("07_edit_extension", r'''
digraph G {
    rankdir=LR; bgcolor="white"; fontname="Helvetica"; nodesep=0.45; ranksep=0.65;
    node [shape=box, style="rounded,filled", fontname="Helvetica", fontsize=11, fillcolor="#FFFFFF"];

    // existing nodes (white)
    new_page    [label="stats/new/page.tsx"];
    list        [label="StatsEntriesList\n(+ Edit link on own rows)"];
    form        [label="StatsForm\n(action injected)", fillcolor="#E3F2FD"];
    add_action  [label="addStatEntry"];
    delete_act  [label="deleteStatEntry"];
    svc_add     [label="service.add()"];
    factory     [label="ChallengeTypeFactory\n(registry — untouched)", fillcolor="#FFFDE7"];
    s1          [label="FitnessStrategy"];
    s2          [label="ReadingStrategy"];
    s3          [label="...future strategy", style="rounded,filled,dashed"];
    port_add    [label="IStatsRepo.add"];
    port_list   [label="IStatsRepo.listForChallenge"];
    drizzle     [label="statsRepo (Drizzle)\nimplements IStatsRepo", fillcolor="#E8F5E9"];
    comp        [label="composition.ts\n(DI root)", fillcolor="#FFF3E0"];
    db          [label="Postgres · stat_entries\nRLS: stats update own", shape=cylinder, fillcolor="#ECEFF1"];

    // NEW nodes (yellow)
    edit_page   [label="stats/[entryId]/edit/page.tsx\n(NEW)", fillcolor="#FEF3C7"];
    edit_action [label="editStatEntry\n(NEW)", fillcolor="#FEF3C7"];
    svc_upd     [label="service.update()\n(NEW)", fillcolor="#FEF3C7"];
    port_upd    [label="IStatsRepo.update\n(NEW)", fillcolor="#FEF3C7"];
    port_find   [label="IStatsRepo.findOwned\n(NEW)", fillcolor="#FEF3C7"];

    new_page  -> form;
    edit_page -> form;
    list -> edit_page [label="Edit link", style="dashed"];
    form -> add_action  [label="action prop = add"];
    form -> edit_action [label="action prop = edit"];

    add_action  -> svc_add;
    edit_action -> svc_upd;

    svc_add -> factory [label="strategy.statSchema.parse", style="dashed"];
    svc_upd -> factory [label="SAME schema", style="dashed"];
    factory -> s1 [style="dashed", arrowhead=none];
    factory -> s2 [style="dashed", arrowhead=none];
    factory -> s3 [style="dashed", arrowhead=none];

    svc_add -> port_add;
    svc_upd -> port_upd;
    edit_page -> port_find [label="prefill", style="dashed"];

    port_add  -> drizzle [arrowhead=onormal, style="dashed", label="implements"];
    port_upd  -> drizzle [arrowhead=onormal, style="dashed"];
    port_find -> drizzle [arrowhead=onormal, style="dashed"];
    port_list -> drizzle [arrowhead=onormal, style="dashed"];

    comp -> drizzle [label="injects", style="bold"];
    comp -> svc_add [label="DI", style="bold"];
    comp -> svc_upd [label="DI", style="bold"];

    drizzle -> db;
    delete_act -> drizzle;

    {rank=same; new_page; edit_page; list;}
    {rank=same; add_action; edit_action; delete_act;}
    {rank=same; svc_add; svc_upd;}
    {rank=same; port_add; port_upd; port_find; port_list;}
}
''')


if __name__ == "__main__":
    arch()
    er()
    flow()
    layers()
    deploy()
    factory()
    edit_extension()
    print("done.")
