from xhtml2pdf import pisa

html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 15mm;
            background-color: #f4f7f6;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #333;
            line-height: 1.5;
            background-color: #f4f7f6;
            margin: 0;
            padding: 0;
        }
        .header {
            background-color: #2c3e50;
            color: white;
            padding: 25pt;
            text-align: center;
            border-bottom: 5px solid #3498db;
        }
        h1 { margin: 0; font-size: 22pt; text-transform: uppercase; letter-spacing: 1pt; }
        .user-info { font-size: 10pt; margin-top: 8pt; opacity: 0.9; }
        
        .container { padding: 20pt; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10pt;
            background: white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        th {
            background-color: #34495e;
            color: white;
            text-align: left;
            padding: 12pt 10pt;
            font-size: 11pt;
            text-transform: uppercase;
        }
        td {
            padding: 12pt 10pt;
            border-bottom: 1px solid #eee;
            font-size: 10pt;
            vertical-align: top;
        }
        .status-done { color: #27ae60; font-weight: bold; }
        .status-next { color: #e67e22; font-weight: bold; border: 1px solid #e67e22; padding: 2pt 5pt; border-radius: 3pt; font-size: 9pt; }
        .status-pending { color: #95a5a6; font-style: italic; }
        
        .module-title { font-weight: bold; color: #2980b9; display: block; margin-bottom: 5pt; font-size: 11pt; }
        .topics-list { margin: 0; padding-left: 15pt; color: #555; }
        .topics-list li { margin-bottom: 3pt; }
        
        .rule-box {
            margin-top: 25pt;
            background: #fff;
            padding: 15pt;
            border-left: 5px solid #3498db;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .rule-box strong { color: #2c3e50; font-size: 11pt; }
        
        .footer {
            margin-top: 30pt;
            font-size: 8pt;
            color: #95a5a6;
            text-align: center;
            border-top: 1px solid #ddd;
            padding-top: 10pt;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>2026 DevOps Engineering Syllabus</h1>
        <div class="user-info">SAMUEL CHUKWUMA • CAREER TRANSITION TRACK</div>
    </div>

    <div class="container">
        <table>
            <thead>
                <tr>
                    <th style="width: 25%;">Module</th>
                    <th style="width: 55%;">Curriculum & Key Topics</th>
                    <th style="width: 20%;">Status</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><span class="module-title">Module 1: Foundations & Linux CLI</span></td>
                    <td>
                        <ul class="topics-list">
                            <li><strong>Internals:</strong> File Hierarchy, Permissions (chmod/chown)</li>
                            <li><strong>Shell:</strong> Piping, Redirection, Environment (.bashrc)</li>
                            <li><strong>Automation:</strong> Bash Scripting, Args, Logic</li>
                            <li><strong>Operations:</strong> Process Management (htop, ps, kill)</li>
                        </ul>
                    </td>
                    <td><span class="status-done">COMPLETED ✅</span></td>
                </tr>
                <tr>
                    <td><span class="module-title">Module 2: Git & CI/CD Automation</span></td>
                    <td>
                        <ul class="topics-list">
                            <li><strong>Git Mastery:</strong> Branching, Merging, Rebase, Conventions</li>
                            <li><strong>Actions:</strong> YAML, Workflows, Runners</li>
                            <li><strong>Quality:</strong> Linting, Formatting, Security Scanning</li>
                            <li><strong>CI/CD Logic:</strong> Automated Integration & Deployment</li>
                        </ul>
                    </td>
                    <td><span class="status-next">CURRENT / NEXT</span></td>
                </tr>
                <tr>
                    <td><span class="module-title">Module 3: Networking & Remote Ops</span></td>
                    <td>
                        <ul class="topics-list">
                            <li><strong>Protocols:</strong> HTTP/S, DNS, TCP/IP Fundamentals</li>
                            <li><strong>Remote:</strong> SSH, Curl, Wget, Key Management</li>
                            <li><strong>Diagnostics:</strong> Netstat, SS, Port Analysis</li>
                        </ul>
                    </td>
                    <td><span class="status-pending">PENDING</span></td>
                </tr>
                <tr>
                    <td><span class="module-title">Module 4: Docker Deep Dive</span></td>
                    <td>
                        <ul class="topics-list">
                            <li><strong>Multi-Container:</strong> Docker Compose Orchestration</li>
                            <li><strong>Data:</strong> Volumes & Persistent Storage</li>
                            <li><strong>Optimization:</strong> Multi-stage Builds & Security</li>
                        </ul>
                    </td>
                    <td><span class="status-pending">PENDING</span></td>
                </tr>
                <tr>
                    <td><span class="module-title">Module 5: IaC & Cloud (ACE)</span></td>
                    <td>
                        <ul class="topics-list">
                            <li><strong>Providers:</strong> Google Cloud (GCP) / AWS Core Services</li>
                            <li><strong>Terraform:</strong> Infrastructure as Code Fundamentals</li>
                            <li><strong>Ansible:</strong> Automated Configuration Management</li>
                        </ul>
                    </td>
                    <td><span class="status-pending">PENDING</span></td>
                </tr>
                <tr>
                    <td><span class="module-title">Module 6: Kubernetes Orchestration</span></td>
                    <td>
                        <ul class="topics-list">
                            <li><strong>Management:</strong> Clusters, Nodes, and Pods</li>
                            <li><strong>Reliability:</strong> Self-Healing & Automated Recovery</li>
                            <li><strong>Scaling:</strong> HPA (Horizontal Pod Autoscaling)</li>
                        </ul>
                    </td>
                    <td><span class="status-pending">PENDING</span></td>
                </tr>
            </tbody>
        </table>

        <div class="rule-box">
            <strong>DevOps Success Manifesto:</strong>
            <ul style="font-size: 10pt; margin-top: 8pt; color: #444;">
                <li><strong>70/30 Practice Rule:</strong> Spend 70% of time in the terminal, 30% on theory.</li>
                <li><strong>The Dependency Rule:</strong> Master Linux foundations before touching Docker.</li>
                <li><strong>The Creator Rule:</strong> Build a practical script/tool for every module.</li>
            </ul>
        </div>
    </div>

    <div class="footer">
        Generated for Samuel Chukwuma • 2026 DevOps Journey Roadmap
    </div>
</body>
</html>
"""

with open("DevOps_Roadmap_2026.html", "w", encoding="utf-8") as f:
    f.write(html_content)

print("HTML file created successfully.")

pisa.CreatePDF(html_content, dest=open("DevOps_Roadmap_2026.pdf", "wb"))

print("PDF file created successfully.")